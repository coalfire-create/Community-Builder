import { Router, type IRouter } from "express";
import { FieldValue, postsCol, commentsCol, likesCol, usersCol, toDate, type FSPost, type FSUser, type FSComment } from "../lib/firestore";
import { CreatePostBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function formatPost(id: string, post: FSPost, authorRole: string, likeCnt: number, commentCnt: number, isLiked: boolean, isOwnPost: boolean) {
  return {
    id,
    title: post.title,
    content: post.content,
    authorRole,
    likeCount: likeCnt,
    commentCount: commentCnt,
    isLiked,
    isOwnPost,
    type: post.type,
    createdAt: toDate(post.createdAt),
  };
}

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
  const limit = parseInt((req.query.limit as string) ?? "20", 10) || 20;
  const userId = req.session.userId!;

  const snap = await postsCol()
    .where("type", "==", "post")
    .orderBy("createdAt", "desc")
    .get();

  const total = snap.size;
  const rows = snap.docs.slice((page - 1) * limit, (page - 1) * limit + limit);

  if (rows.length === 0) {
    res.json({ posts: [], total, page, limit });
    return;
  }

  const authorIds = [...new Set(rows.map((d) => (d.data() as FSPost).authorId))];
  const authorMap = new Map<string, string>();
  await Promise.all(authorIds.map(async (aid) => {
    const doc = await usersCol().doc(aid).get();
    if (doc.exists) authorMap.set(aid, (doc.data() as FSUser).role);
  }));

  const postIds = rows.map((d) => d.id);
  const likedSet = new Set<string>();
  for (let i = 0; i < postIds.length; i += 10) {
    const chunk = postIds.slice(i, i + 10);
    const likedSnap = await likesCol()
      .where("userId", "==", userId)
      .where("postId", "in", chunk)
      .get();
    likedSnap.docs.forEach((d) => likedSet.add(d.data().postId));
  }

  const posts = rows.map((d) => {
    const p = d.data() as FSPost;
    const isAnonymous = p.isAnonymous !== false;
    const authorRole = isAnonymous ? "student" : (authorMap.get(p.authorId) ?? "student");
    return formatPost(d.id, p, authorRole, p.likeCount ?? 0, p.commentCount ?? 0, likedSet.has(d.id), p.authorId === userId);
  });

  res.json({ posts, total, page, limit });
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const role = req.session.role!;

  const docRef = postsCol().doc();
  const now = new Date();
  const isAnonymous = role === "student" ? true : (parsed.data.isAnonymous !== false);
  const postData = {
    title: parsed.data.title,
    content: parsed.data.content,
    authorId: userId,
    isAnonymous,
    type: "post" as const,
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
  };
  await docRef.set(postData);

  const authorRole = isAnonymous ? "student" : role;
  res.status(201).json(formatPost(docRef.id, { ...postData, createdAt: undefined as any, id: docRef.id }, authorRole, 0, 0, false, true));
});

router.get("/posts/:postId", requireAuth, async (req, res): Promise<void> => {
  const postId = req.params.postId;
  const userId = req.session.userId!;

  const doc = await postsCol().doc(postId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Not Found", message: "게시글을 찾을 수 없습니다." });
    return;
  }

  const post = doc.data() as FSPost;
  if (post.type !== "post") {
    res.status(404).json({ error: "Not Found", message: "게시글을 찾을 수 없습니다." });
    return;
  }

  const authorDoc = await usersCol().doc(post.authorId).get();
  const isAnonymous = post.isAnonymous !== false;
  const authorRole = isAnonymous ? "student" : (authorDoc.exists ? (authorDoc.data() as FSUser).role : "student");

  const likeSnap = await likesCol().where("postId", "==", postId).where("userId", "==", userId).limit(1).get();

  const commentsSnap = await commentsCol()
    .where("postId", "==", postId)
    .get();

  const sortedComments = commentsSnap.docs.sort((a, b) => {
    const aT = (a.data() as FSComment).createdAt?.toMillis?.() ?? 0;
    const bT = (b.data() as FSComment).createdAt?.toMillis?.() ?? 0;
    return aT - bT;
  });

  const commentAuthorIds = [...new Set(sortedComments.map((d) => (d.data() as FSComment).authorId))];
  const commentAuthorMap = new Map<string, string>();
  await Promise.all(commentAuthorIds.map(async (aid) => {
    const d = await usersCol().doc(aid).get();
    if (d.exists) commentAuthorMap.set(aid, (d.data() as FSUser).role);
  }));

  const comments = sortedComments.map((d) => {
    const c = d.data() as FSComment;
    return {
      id: d.id,
      content: c.content,
      authorRole: commentAuthorMap.get(c.authorId) ?? "student",
      isOwnComment: c.authorId === userId,
      createdAt: toDate(c.createdAt),
    };
  });

  const base = formatPost(doc.id, post, authorRole, post.likeCount ?? 0, post.commentCount ?? 0, !likeSnap.empty, post.authorId === userId);
  res.json({ ...base, comments });
});

router.delete("/posts/:postId", requireAuth, async (req, res): Promise<void> => {
  const postId = req.params.postId;
  const userId = req.session.userId!;
  const role = req.session.role!;

  const doc = await postsCol().doc(postId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Not Found", message: "게시글을 찾을 수 없습니다." });
    return;
  }

  const post = doc.data() as FSPost;
  if (post.authorId !== userId && role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "삭제 권한이 없습니다." });
    return;
  }

  await postsCol().doc(postId).delete();
  res.json({ message: "게시글이 삭제되었습니다." });
});

export default router;
