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
  console.error("Failed to load .env manually in api-server:", e);
}

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "8080";
const port = Number(rawPort);

if (!process.env.VERCEL) {
  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
  server.on("error", (err) => {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  });
}

export default app;

