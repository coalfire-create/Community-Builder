import { Router, type IRouter } from "express";
import { db, postsTable, commentsTable, likesTable, usersTable } from "@workspace/db";
import { eq, desc, and, count, inArray } from "drizzle-orm";
import { CreateAnnouncementBody, ListAnnouncementsQueryParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router: IRouter = Router();

function formatPost(post: typeof postsTable.$inferSelect, author: typeof usersTable.$inferSelect, likeCnt: number, commentCnt: number, isLiked: boolean, isOwnPost: boolean) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    authorRole: author.role,
    likeCount: likeCnt,
    commentCount: commentCnt,
    isLiked,
    isOwnPost,
    type: post.type,
    createdAt: post.createdAt,
  };
}

router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAnnouncementsQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;
  const userId = req.session.userId!;

  const [{ total }] = await db.select({ total: count() }).from(postsTable).where(eq(postsTable.type, "announcement"));

  const rows = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.type, "announcement"))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) {
    res.json({ posts: [], total: Number(total), page, limit });
    return;
  }

  const postIds = rows.map((p) => p.id);
  const authorIds = [...new Set(rows.map((p) => p.authorId))];

  const authors = await db.select().from(usersTable).where(inArray(usersTable.id, authorIds));
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const likeCounts = await db.select({ postId: likesTable.postId, cnt: count() }).from(likesTable).where(inArray(likesTable.postId, postIds)).groupBy(likesTable.postId);
  const likeCountMap = new Map(likeCounts.map((l) => [l.postId, Number(l.cnt)]));

  const userLikes = await db.select({ postId: likesTable.postId }).from(likesTable).where(and(inArray(likesTable.postId, postIds), eq(likesTable.userId, userId)));
  const likedSet = new Set(userLikes.map((l) => l.postId));

  const commentCounts = await db.select({ postId: commentsTable.postId, cnt: count() }).from(commentsTable).where(inArray(commentsTable.postId, postIds)).groupBy(commentsTable.postId);
  const commentCountMap = new Map(commentCounts.map((c) => [c.postId, Number(c.cnt)]));

  const posts = rows.map((p) => {
    const author = authorMap.get(p.authorId)!;
    return formatPost(p, author, likeCountMap.get(p.id) ?? 0, commentCountMap.get(p.id) ?? 0, likedSet.has(p.id), p.authorId === userId);
  });

  res.json({ posts, total: Number(total), page, limit });
});

router.post("/announcements", requireRole(["council", "admin"]), async (req, res): Promise<void> => {
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const [post] = await db.insert(postsTable).values({
    title: parsed.data.title,
    content: parsed.data.content,
    authorId: userId,
    type: "announcement",
  }).returning();

  res.status(201).json(formatPost(post, author, 0, 0, false, true));
});

router.get("/announcements/:postId", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);
  const userId = req.session.userId!;

  const [post] = await db.select().from(postsTable).where(and(eq(postsTable.id, postId), eq(postsTable.type, "announcement")));
  if (!post) {
    res.status(404).json({ error: "Not Found", message: "공지사항을 찾을 수 없습니다." });
    return;
  }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
  const [{ cnt: likeCnt }] = await db.select({ cnt: count() }).from(likesTable).where(eq(likesTable.postId, postId));
  const [{ cnt: commentCnt }] = await db.select({ cnt: count() }).from(commentsTable).where(eq(commentsTable.postId, postId));
  const userLike = await db.select().from(likesTable).where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)));

  const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, postId)).orderBy(commentsTable.createdAt);
  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const commentAuthors = authorIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, authorIds))
    : [];
  const commentAuthorMap = new Map(commentAuthors.map((a) => [a.id, a]));

  const formattedComments = comments.map((c) => ({
    id: c.id,
    content: c.content,
    authorRole: commentAuthorMap.get(c.authorId)?.role ?? "student",
    isOwnComment: c.authorId === userId,
    createdAt: c.createdAt,
  }));

  const base = formatPost(post, author, Number(likeCnt), Number(commentCnt), userLike.length > 0, post.authorId === userId);
  res.json({ ...base, comments: formattedComments });
});

router.delete("/announcements/:postId", requireRole(["council", "admin"]), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.postId) ? req.params.postId[0] : req.params.postId;
  const postId = parseInt(rawId, 10);
  const userId = req.session.userId!;
  const role = req.session.role!;

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Not Found", message: "공지사항을 찾을 수 없습니다." });
    return;
  }

  if (post.authorId !== userId && role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "삭제 권한이 없습니다." });
    return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, postId));
  res.json({ message: "공지사항이 삭제되었습니다." });
});

export default router;
