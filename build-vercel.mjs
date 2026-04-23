import { execSync } from 'child_process';
import { cpSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));

execSync('pnpm --filter @workspace/community run build', {
  stdio: 'inherit',
  cwd: ROOT,
});

execSync('pnpm --filter @workspace/api-server run build:app', {
  stdio: 'inherit',
  cwd: ROOT,
});

const src = resolve(ROOT, 'artifacts/community/dist/public');
const dest = resolve(ROOT, 'dist_web');

if (existsSync(dest)) rmSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log('dist_web 생성 완료:', dest);
