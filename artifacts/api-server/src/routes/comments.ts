import { Router, type IRouter } from "express";
import { db, commentsTable, usersTable, postsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreatePostCommentBody, CreateAnnouncementCommentBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.session.userId!;

  const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, postId)).orderBy(commentsTable.createdAt);

  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(eq(usersTable.id, authorIds[0]))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  res.json(comments.map((c) => ({
    id: c.id,
    content: c.content,
    authorRole: authorMap.get(c.authorId)?.role ?? "student",
    isOwnComment: c.authorId === userId,
    createdAt: c.createdAt,
  })));
});

router.post("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.session.userId!;

  const parsed = CreatePostCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Not Found", message: "게시글을 찾을 수 없습니다." });
    return;
  }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const [comment] = await db.insert(commentsTable).values({
    content: parsed.data.content,
    postId,
    authorId: userId,
  }).returning();

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    authorRole: author.role,
    isOwnComment: true,
    createdAt: comment.createdAt,
  });
});

router.delete("/posts/:postId/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId, 10);
  const userId = req.session.userId!;
  const role = req.session.role!;

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!comment) {
    res.status(404).json({ error: "Not Found", message: "댓글을 찾을 수 없습니다." });
    return;
  }

  if (comment.authorId !== userId && role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "삭제 권한이 없습니다." });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  res.json({ message: "댓글이 삭제되었습니다." });
});

router.get("/announcements/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.session.userId!;

  const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, postId)).orderBy(commentsTable.createdAt);

  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const authors = authorIds.length > 0
    ? await db.select().from(usersTable).where(eq(usersTable.id, authorIds[0]))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  res.json(comments.map((c) => ({
    id: c.id,
    content: c.content,
    authorRole: authorMap.get(c.authorId)?.role ?? "student",
    isOwnComment: c.authorId === userId,
    createdAt: c.createdAt,
  })));
});

router.post("/announcements/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.session.userId!;

  const parsed = CreateAnnouncementCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Not Found", message: "공지사항을 찾을 수 없습니다." });
    return;
  }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const [comment] = await db.insert(commentsTable).values({
    content: parsed.data.content,
    postId,
    authorId: userId,
  }).returning();

  res.status(201).json({
    id: comment.id,
    content: comment.content,
    authorRole: author.role,
    isOwnComment: true,
    createdAt: comment.createdAt,
  });
});

router.delete("/announcements/:postId/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  const commentId = parseInt(req.params.commentId, 10);
  const userId = req.session.userId!;
  const role = req.session.role!;

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!comment) {
    res.status(404).json({ error: "Not Found", message: "댓글을 찾을 수 없습니다." });
    return;
  }

  if (comment.authorId !== userId && role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "삭제 권한이 없습니다." });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  res.json({ message: "댓글이 삭제되었습니다." });
});

export default router;
