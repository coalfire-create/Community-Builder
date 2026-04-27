import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pg from "pg";
import "./lib/firestore";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

// Vercel 서버리스 환경에서는 pino-http worker thread가 동작하지 않으므로 스킵
if (!process.env.VERCEL) {
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
}

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for session store");
}

// Remove channel_binding=require — not supported reliably in all hosting environments
const dbUrl = process.env.DATABASE_URL
  .replace(/[&?]channel_binding=require/g, "")
  .replace(/\?&/, "?");

const { Pool } = pg;
const sessionPool = new Pool({ connectionString: dbUrl });

// Prevent unhandled pool errors from crashing the process
sessionPool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

const PgSession = connectPg(session);

app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use("/api", router);

// Global error handler — must be AFTER all routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err?.message, err?.stack);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error",
      message: err?.message ?? "알 수 없는 오류가 발생했습니다.",
    });
  }
});

export default app;
