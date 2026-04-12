# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a full-stack Korean university community app for Myongji University's Mechanical Systems Engineering department (명지대 기계시스템공학과).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 with express-session + bcryptjs
- **Session store**: connect-pg-simple (PostgreSQL-backed sessions)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Artifacts

### API Server (`artifacts/api-server`)
Express 5 backend at `/api` path. Handles:
- Auth: register, login, logout, /me (session-based)
- Posts: CRUD with anonymous display
- Announcements: Council/admin only creation
- Comments: On posts and announcements
- Likes: Toggle per user per post
- Feed: Combined feed with announcements pinned first
- Admin: User role management

### Community Frontend (`artifacts/community`)
React + Vite app at `/` path. Pages:
- `/` — Login
- `/register` — Registration (department-gated)
- `/feed` — Main feed with tabs
- `/post/:id` — Post detail with comments
- `/announcement/:id` — Announcement detail with comments
- `/write` — Create post/announcement
- `/admin` — Admin panel (admin role only)
- `/blocked` — Department access block page

## User Roles & Seed Accounts

- **admin001 / admin1234** — Admin role
- **council001 / council1234** — Council role (학생회)
- Regular students can register with `department: 기계시스템공학과`

## Database Schema

Tables:
- `users` — studentId, passwordHash, name, department, role (student|council|admin)
- `posts` — title, content, authorId, type (post|announcement)
- `comments` — content, postId, authorId
- `likes` — postId, userId (unique constraint)
- `session` — connect-pg-simple session store
- `allowed_student_ids` — pre-approved 1st year student IDs (studentId, note)

## Registration Flow

**1학년 (1st year)**: Admin pre-enters student IDs in the allowed list via admin panel. These IDs can register directly without image verification.

**2학년+ (2nd year and above)**: Must upload a screenshot of the MSI portal (msi.mju.ac.kr) showing 기계공학부 in the 학부(과) field + their student ID. The server uses OpenAI GPT-5.2 vision to verify the image matches. Requires `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` env vars (auto-provisioned via Replit AI Integrations).

**API endpoints**:
- `GET /api/auth/check-student-id?studentId=<id>` — returns `{ allowed: boolean }` (public)
- `GET /api/admin/allowed-student-ids` — list all pre-approved IDs (admin only)
- `POST /api/admin/allowed-student-ids` — add IDs: `{ studentIds: string | string[], note?: string }` (admin only)
- `DELETE /api/admin/allowed-student-ids/:studentId` — remove an ID (admin only)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/scripts run seed` — seed admin/council accounts

## Anonymous Display Rules

- Regular post/comment: shows "익명"
- Council/admin post/comment: shows "익명 ✅ 학생회"

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
