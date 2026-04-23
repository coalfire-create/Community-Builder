import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

if (!getApps().length) {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const firestore = getFirestore();
export { FieldValue, Timestamp };

export type UserRole = "student" | "council" | "admin";
export type PostType = "post" | "announcement";

export interface FSUser {
  id: string;
  studentId: string;
  passwordHash: string;
  name: string;
  department: string;
  role: UserRole;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface FSPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  type: PostType;
  likeCount: number;
  commentCount: number;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface FSComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface FSLike {
  postId: string;
  userId: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export const usersCol = () => firestore.collection("users");
export const postsCol = () => firestore.collection("posts");
export const commentsCol = () => firestore.collection("comments");
export const likesCol = () => firestore.collection("likes");

export function toDate(ts: FirebaseFirestore.Timestamp | undefined): string {
  return ts ? ts.toDate().toISOString() : new Date().toISOString();
}
