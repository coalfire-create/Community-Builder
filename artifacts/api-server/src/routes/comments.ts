import { Router, type IRouter } from "express";
import { commentsCol, postsCol, usersCol, toDate, type FSComment, type FSUser } from "../lib/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { CreatePostCommentBody, CreateAnnouncementCommentBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getComments(postId: string, userId: string) {
  const snap = await commentsCol()
    .where("postId", "==", postId)
    .get();

  const authorIds = [...new Set(snap.docs.map((d) => (d.data() as FSComment).authorId))];
  const authorMap = new Map<string, string>();
  await Promise.all(authorIds.map(async (aid) => {
    const d = await usersCol().doc(aid).get();
    if (d.exists) authorMap.set(aid, (d.data() as FSUser).role);
  }));

  const sorted = snap.docs.sort((a, b) => {
    const aT = (a.data() as FSComment).createdAt?.toMillis?.() ?? 0;
    const bT = (b.data() as FSComment).createdAt?.toMillis?.() ?? 0;
    return aT - bT;
  });

  return sorted.map((d) => {
    const c = d.data() as FSComment;
    return {
      id: d.id,
      content: c.content,
      authorRole: authorMap.get(c.authorId) ?? "student",
      isOwnComment: c.authorId === userId,
      createdAt: toDate(c.createdAt),
    };
  });
}

async function addComment(postId: string, userId: string, content: string, res: any) {
  const postDoc = await postsCol().doc(postId).get();
  if (!postDoc.exists) {
    res.status(404).json({ error: "Not Found", message: "게시글을 찾을 수 없습니다." });
    return;
  }

  const authorDoc = await usersCol().doc(userId).get();
  const authorRole = authorDoc.exists ? (authorDoc.data() as FSUser).role : "student";

  const now = new Date();
  const docRef = commentsCol().doc();
  await docRef.set({ postId, authorId: userId, content, createdAt: now });

  await postsCol().doc(postId).update({ commentCount: FieldValue.increment(1) });

  res.status(201).json({
    id: docRef.id,
    content,
    authorRole,
    isOwnComment: true,
    createdAt: now.toISOString(),
  });
}

async function deleteComment(commentId: string, userId: string, role: string, res: any) {
  const doc = await commentsCol().doc(commentId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Not Found", message: "댓글을 찾을 수 없습니다." });
    return;
  }

  const comment = doc.data() as FSComment;
  if (comment.authorId !== userId && role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "삭제 권한이 없습니다." });
    return;
  }

  await commentsCol().doc(commentId).delete();
  await postsCol().doc(comment.postId).update({ commentCount: FieldValue.increment(-1) });
  res.json({ message: "댓글이 삭제되었습니다." });
}

router.get("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const comments = await getComments(req.params.postId, req.session.userId!);
  res.json(comments);
});

router.post("/posts/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }
  await addComment(req.params.postId, req.session.userId!, parsed.data.content, res);
});

router.delete("/posts/:postId/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  await deleteComment(req.params.commentId, req.session.userId!, req.session.role!, res);
});

router.get("/announcements/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const comments = await getComments(req.params.postId, req.session.userId!);
  res.json(comments);
});

router.post("/announcements/:postId/comments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAnnouncementCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }
  await addComment(req.params.postId, req.session.userId!, parsed.data.content, res);
});

router.delete("/announcements/:postId/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  await deleteComment(req.params.commentId, req.session.userId!, req.session.role!, res);
});

export default router;
