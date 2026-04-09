import { Router, type IRouter } from "express";
import { db, postsTable, commentsTable, likesTable, usersTable } from "@workspace/db";
import { eq, desc, and, count, inArray, or } from "drizzle-orm";
import { GetFeedQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/feed", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetFeedQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;
  const userId = req.session.userId!;

  const [{ total }] = await db.select({ total: count() }).from(postsTable);

  const rows = await db
    .select()
    .from(postsTable)
    .orderBy(desc(postsTable.type), desc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) {
    res.json({ items: [], total: Number(total), page, limit });
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

  const items = rows.map((p) => {
    const author = authorMap.get(p.authorId)!;
    return {
      id: p.id,
      title: p.title,
      content: p.content,
      authorRole: author?.role ?? "student",
      likeCount: likeCountMap.get(p.id) ?? 0,
      commentCount: commentCountMap.get(p.id) ?? 0,
      isLiked: likedSet.has(p.id),
      isOwnPost: p.authorId === userId,
      type: p.type,
      createdAt: p.createdAt,
    };
  });

  res.json({ items, total: Number(total), page, limit });
});

export default router;
