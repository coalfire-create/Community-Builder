import { Router, type IRouter } from "express";
import { usersCol } from "../lib/firestore";
import pg from "pg";

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

  // Only required secrets determine health — exclude informational flags
  const requiredEnvOk =
    env.hasFirebaseProjectId &&
    env.hasFirebaseClientEmail &&
    env.hasFirebasePrivateKey &&
    env.hasSessionSecret &&
    env.hasDatabaseUrl &&
    env.hasGeminiApiKey;

  const services: Record<string, string> = {};

  // Probe Firestore
  try {
    await usersCol().limit(1).get();
    services.firestore = "ok";
  } catch (e: any) {
    services.firestore = `error: ${e?.message ?? String(e)}`;
  }

  // Probe PostgreSQL with a simple SELECT 1
  const dbUrl = (process.env.DATABASE_URL ?? "")
    .replace(/[&?]channel_binding=require/g, "")
    .replace(/\?&/, "?");
  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query("SELECT 1");
    services.postgresql = "ok";
  } catch (e: any) {
    services.postgresql = `error: ${e?.message ?? String(e)}`;
  } finally {
    await client.end().catch(() => {});
  }

  const allOk =
    requiredEnvOk &&
    services.firestore === "ok" &&
    services.postgresql === "ok";

  res.status(allOk ? 200 : 500).json({ ok: allOk, env, services });
});

export default router;
