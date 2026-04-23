import { Router, type IRouter } from "express";
import { likesCol, postsCol, type FSPost } from "../lib/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function toggleLike(postId: string, userId: string) {
  const existingSnap = await likesCol()
    .where("postId", "==", postId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  const postRef = postsCol().doc(postId);

  if (!existingSnap.empty) {
    await existingSnap.docs[0].ref.delete();
    await postRef.update({ likeCount: FieldValue.increment(-1) });
    const updated = await postRef.get();
    return { liked: false, likeCount: (updated.data() as FSPost)?.likeCount ?? 0 };
  } else {
    await likesCol().doc().set({ postId, userId, createdAt: new Date() });
    await postRef.update({ likeCount: FieldValue.increment(1) });
    const updated = await postRef.get();
    return { liked: true, likeCount: (updated.data() as FSPost)?.likeCount ?? 0 };
  }
}

router.post("/posts/:postId/like", requireAuth, async (req, res): Promise<void> => {
  const postId = req.params.postId;
  const userId = req.session.userId!;

  const doc = await postsCol().doc(postId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Not Found", message: "게시글을 찾을 수 없습니다." });
    return;
  }

  const result = await toggleLike(postId, userId);
  res.json(result);
});

router.post("/announcements/:postId/like", requireAuth, async (req, res): Promise<void> => {
  const postId = req.params.postId;
  const userId = req.session.userId!;

  const doc = await postsCol().doc(postId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Not Found", message: "공지사항을 찾을 수 없습니다." });
    return;
  }

  const result = await toggleLike(postId, userId);
  res.json(result);
});

export default router;
