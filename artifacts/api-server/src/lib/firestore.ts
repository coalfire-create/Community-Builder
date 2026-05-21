// @ts-nocheck
import fs from "fs";
import path from "path";

// Proactively load .env variables from workspace root or parents
try {
  let currentDir = process.cwd();
  let envPath = "";
  // Search up to 4 directory levels up to find the root .env file
  for (let i = 0; i < 4; i++) {
    const checkPath = path.resolve(currentDir, ".env");
    if (fs.existsSync(checkPath)) {
      envPath = checkPath;
      break;
    }
    currentDir = path.resolve(currentDir, "..");
  }
  if (envPath) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach(line => {
      const parts = line.trim().split("=");
      if (parts.length >= 2 && !line.startsWith("#")) {
        const key = parts[0].trim();
        let val = parts.slice(1).join("=").trim();
        // strip surrounding quotes if present
        val = val.replace(/^['"]|['"]$/g, "");
        // convert escaped newlines
        val = val.replace(/\\n/g, "\n");
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.error("Failed to load .env manually in firestore:", e);
}

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

if (!getApps().length) {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  // Replit may store the key with literal \n or actual newlines — handle both
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  initializeApp({
    credential: cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
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
  isAnonymous?: boolean;
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
