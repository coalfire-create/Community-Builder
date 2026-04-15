import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// Vercel 배포 시 VITE_API_BASE_URL 환경변수로 Replit API 서버 URL을 지정
if (import.meta.env.VITE_API_BASE_URL) {
  setBaseUrl(import.meta.env.VITE_API_BASE_URL as string);
}

createRoot(document.getElementById("root")!).render(<App />);
