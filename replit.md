# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full-stack Korean university community app for Myongji University's Mechanical Systems Engineering department (명지대 기계시스템공학과).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 with cookie-session + bcryptjs
- **Session store**: cookie-session (signed cookies — no DB required)
- **Primary database**: Firebase Firestore (users, posts, comments, likes)
- **AI verification**: Google Gemini 2.5 Flash (MSI portal screenshot verification)
- **Validation**: Zod (`zod/v4`)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Artifacts

### API Server (`artifacts/api-server`)
Express 5 backend at `/api` path. All data (except sessions) stored in Firestore.

- Auth: register (Gemini AI image verification), login, logout, /me
- Posts: CRUD for regular posts
- Announcements: Council/admin-only creation
- Comments: On posts and announcements (sorted in-memory, no composite index needed)
- Likes: Toggle per user per post (denormalized count on post doc)
- Feed: Combined posts + announcements sorted by createdAt desc
- Admin: User role management (GET/PATCH users)

**Firestore Collections:**
- `users` — studentId, passwordHash, name, department, role, createdAt
- `posts` — title, content, authorId, type (post|announcement), likeCount, commentCount, createdAt
- `comments` — postId, authorId, content, createdAt
- `likes` — postId, userId, createdAt

**PostgreSQL** (only used for):
- `session` — express-session store via connect-pg-simple

### Community Frontend (`artifacts/community`)
React + Vite app at `/` path.

Pages:
- `/` — Login
- `/register` — Registration with Gemini AI MSI screenshot verification
- `/feed` — Main feed (inline ComposeBox, posts + announcements)
- `/post/:id` — Post detail with comments
- `/announcement/:id` — Announcement detail with comments
- `/admin` — Admin panel (admin role only)

**Splash screen**: Blue bg (#003DA5), "내가 누구야" → "내가 기계다" slide animation, shows once per session.

## User Roles & Accounts

- **admin001 / admin1234** — Admin (in Firestore, doc id: `70SbRDjlJdhBihrTxK0f`)
- **council001 / council1234** — Council/학생회 (doc id: `pFNOPbRHOOFZhLiiF3m2`)
- Students must register with Gemini AI image verification (MSI portal screenshot)

## Registration Flow

**All students** must upload a screenshot of the MSI portal (msi.mju.ac.kr) showing:
1. 명지대학교 학생정보시스템 화면
2. 학부(과) = 기계공학부 또는 기계시스템 관련
3. 학번이 입력한 값과 일치

Verified by Gemini 2.5 Flash vision AI. `GEMINI_API_KEY` (standard Google API key) takes priority; falls back to Replit proxy `AI_INTEGRATIONS_GEMINI_API_KEY` for local dev.

## Deployment (Vercel)

Both frontend and API server run on Vercel:
- **Frontend**: static build from `artifacts/community/dist/public` (outputDirectory)
- **API**: `api/index.ts` at project root → Vercel Serverless Function (maxDuration: 30s)
- **Routing** in `vercel.json`: `/api/*` → serverless, filesystem → static, fallback → `index.html`

**Required Vercel Environment Variables:**
| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `DATABASE_URL` | Neon (or other) PostgreSQL connection string for sessions |
| `SESSION_SECRET` | Random secret for express-session |
| `FIREBASE_PROJECT_ID` | Firebase project id (`mechanic-myongi`) |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (with `\n` newlines) |
| `NODE_ENV` | `production` |

Session table is auto-created (`createTableIfMissing: true`) — no manual SQL needed.

## Firebase Config

Project ID: `mechanic-myongi`
Service account stored in secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
Initialized in: `artifacts/api-server/src/lib/firestore.ts`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Anonymous Display Rules

- Regular post/comment: shows "익명"
- Council/admin post/comment: shows "익명 ✅ 학생회"

## Brand

- Color: `#003DA5` (Myongji blue) — set as `--primary` in `index.css`
- Logo: `artifacts/community/public/logo.jpg` (48대 機本 image)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
테스트용

