// @ts-nocheck
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../artifacts/api-server/dist/index.mjs";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // TypeScript가 에러를 뱉지 않도록 as any로 강제 처리합니다.
  return (app as any)(req, res);
}