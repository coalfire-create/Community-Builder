import { Router, type IRouter } from "express";
import { postsCol, likesCol, usersCol, toDate, type FSPost, type FSUser } from "../lib/firestore";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/feed", requireAuth, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
  const limit = parseInt((req.query.limit as string) ?? "20", 10) || 20;
  const userId = req.session.userId!;

  const snap = await postsCol()
    .orderBy("createdAt", "desc")
    .get();

  const total = snap.size;
  const rows = snap.docs.slice((page - 1) * limit, (page - 1) * limit + limit);

  if (rows.length === 0) {
    res.json({ items: [], total, page, limit });
    return;
  }

  const postIds = rows.map((d) => d.id);
  const authorIds = [...new Set(rows.map((d) => (d.data() as FSPost).authorId))];

  const authorMap = new Map<string, string>();
  await Promise.all(authorIds.map(async (aid) => {
    const doc = await usersCol().doc(aid).get();
    if (doc.exists) authorMap.set(aid, (doc.data() as FSUser).role);
  }));

  const chunkSize = 10;
  const likedSet = new Set<string>();
  for (let i = 0; i < postIds.length; i += chunkSize) {
    const chunk = postIds.slice(i, i + chunkSize);
    const likedSnap = await likesCol()
      .where("userId", "==", userId)
      .where("postId", "in", chunk)
      .get();
    likedSnap.docs.forEach((d) => likedSet.add(d.data().postId as string));
  }

  const items = rows.map((d) => {
    const p = d.data() as FSPost;
    return {
      id: d.id,
      title: p.title,
      content: p.content,
      authorRole: authorMap.get(p.authorId) ?? "student",
      likeCount: p.likeCount ?? 0,
      commentCount: p.commentCount ?? 0,
      isLiked: likedSet.has(d.id),
      isOwnPost: p.authorId === userId,
      type: p.type,
      createdAt: toDate(p.createdAt),
    };
  });

  res.json({ items, total, page, limit });
});

export default router;
