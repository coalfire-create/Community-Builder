import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

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
      // Firebase / Google Cloud — kept external because @grpc/grpc-js loads
      // .proto files at runtime using absolute paths that only exist in the
      // original node_modules tree; bundling them breaks those paths in Lambda.
      "firebase-admin",
      "firebase-admin/*",
      "@google-cloud/*",
      "googleapis",
      "@grpc/*",
      "google-auth-library",
      "google-gax",
      // Native / optional add-ons that cannot be bundled
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "pg-native",
      "re2",
      "farmhash",
      "bufferutil",
      "utf-8-validate",
      "nodemailer",
      "knex",
      "typeorm",
      "@prisma/client",
      "@mikro-orm/*",
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
