import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieSession from "cookie-session";
import "./lib/firestore";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

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

app.use(
  cookieSession({
    name: "session",
    secret: process.env.SESSION_SECRET,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  }),
);

app.use("/api", router);

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
