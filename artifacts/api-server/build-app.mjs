import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildApp() {
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: path.resolve(artifactDir, "api/index.mjs"),
    logLevel: "info",
    define: {
      "process.env.VERCEL": '"1"',
    },
    external: [
      "*.node",
      "pino",
      "pino-http",
      "pino-pretty",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "pg-native",
      "firebase-admin",
      "@google-cloud/*",
      "googleapis",
      "re2",
      "farmhash",
      "bufferutil",
      "utf-8-validate",
      "nodemailer",
      "knex",
      "typeorm",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@opentelemetry/*",
      "@aws-sdk/*",
      "@azure/*",
      "@sentry/profiling-node",
      "aws-sdk",
      "dd-trace",
      "newrelic",
      "sequelize",
      "mysql2",
      "oracledb",
      "snappy",
      "realm",
      "onnxruntime-node",
      "@tensorflow/*",
    ],
    sourcemap: false,
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });
}

buildApp().catch((err) => {
  console.error(err);
  process.exit(1);
});
