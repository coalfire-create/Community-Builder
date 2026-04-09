import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const REQUIRED_DEPARTMENT = "기계시스템공학과";

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const { studentId, password, name, department } = parsed.data;

  if (department !== REQUIRED_DEPARTMENT) {
    res.status(403).json({
      error: "Forbidden",
      message: "이 커뮤니티는 명지대 기계시스템공학과 학생 전용입니다.",
    });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.studentId, studentId));
  if (existing.length > 0) {
    res.status(400).json({ error: "Bad Request", message: "이미 존재하는 학번입니다." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db.insert(usersTable).values({
    studentId,
    passwordHash,
    name,
    department,
    role: "student",
  }).returning();

  req.session.userId = user.id;
  req.session.role = user.role;

  res.status(201).json({
    user: {
      id: user.id,
      studentId: user.studentId,
      role: user.role,
      createdAt: user.createdAt,
    },
    message: "회원가입이 완료되었습니다.",
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const { studentId, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.studentId, studentId));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "학번 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "학번 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json({
    user: {
      id: user.id,
      studentId: user.studentId,
      role: user.role,
      createdAt: user.createdAt,
    },
    message: "로그인되었습니다.",
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ message: "로그아웃되었습니다." });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "인증이 필요합니다." });
    return;
  }

  res.json({
    id: user.id,
    studentId: user.studentId,
    role: user.role,
    createdAt: user.createdAt,
  });
});

export default router;
