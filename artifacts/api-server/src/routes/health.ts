import { Router, type IRouter } from "express";
import { usersCol } from "../lib/firestore";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/health", async (_req, res) => {
  const env = {
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    isVercel: !!process.env.VERCEL,
  };

  const services: Record<string, string> = {};

  try {
    await usersCol().limit(1).get();
    services.firestore = "ok";
  } catch (e: any) {
    services.firestore = `error: ${e?.message ?? String(e)}`;
  }

  const allOk = Object.values(env).every(Boolean) && services.firestore === "ok";

  res.status(allOk ? 200 : 500).json({ ok: allOk, env, services });
});

export default router;
