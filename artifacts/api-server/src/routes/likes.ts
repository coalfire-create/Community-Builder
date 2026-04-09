import { Router, type IRouter } from "express";
import { db, likesTable, postsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function toggleLike(postId: number, userId: number) {
  const existing = await db.select().from(likesTable).where(
    and(eq(likesTable.postId, postId), eq(likesTable.userId, userId))
  );

  if (existing.length > 0) {
    await db.delete(likesTable).where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)));
  } else {
    await db.insert(likesTable).values({ postId, userId });
  }

  const [{ cnt }] = await db.select({ cnt: count() }).from(likesTable).where(eq(likesTable.postId, postId));
  return { liked: existing.length === 0, likeCount: Number(cnt) };
}

router.post("/posts/:postId/like", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.session.userId!;

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Not Found", message: "게시글을 찾을 수 없습니다." });
    return;
  }

  const result = await toggleLike(postId, userId);
  res.json(result);
});

router.post("/announcements/:postId/like", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.session.userId!;

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) {
    res.status(404).json({ error: "Not Found", message: "공지사항을 찾을 수 없습니다." });
    return;
  }

  const result = await toggleLike(postId, userId);
  res.json(result);
});

export default router;
