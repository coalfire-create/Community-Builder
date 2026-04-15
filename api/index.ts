import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../artifacts/api-server/src/app";

/**
 * Vercel Serverless Function — Express 앱을 명시적 핸들러로 감쌉니다.
 * export default app 방식은 일부 Vercel 버전에서 제대로 동작하지 않습니다.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res, (err?: unknown) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });
}
