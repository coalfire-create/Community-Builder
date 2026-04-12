import { Router, type IRouter } from "express";
import { db, usersTable, allowedStudentIdsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserRoleBody, UpdateUserRoleParams } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/users", requireRole(["admin"]), async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);

  res.json(users.map((u) => ({
    id: u.id,
    studentId: u.studentId,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  })));
});

router.patch("/admin/users/:userId/role", requireRole(["admin"]), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "사용자를 찾을 수 없습니다." });
    return;
  }

  if (user.role === "admin") {
    res.status(403).json({ error: "Forbidden", message: "관리자의 권한은 변경할 수 없습니다." });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ role: parsed.data.role })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    id: updated.id,
    studentId: updated.studentId,
    name: updated.name,
    role: updated.role,
    createdAt: updated.createdAt,
  });
});

// Allowed student IDs (1학년 pre-approved list)
router.get("/admin/allowed-student-ids", requireRole(["admin"]), async (req, res): Promise<void> => {
  const list = await db.select().from(allowedStudentIdsTable).orderBy(allowedStudentIdsTable.createdAt);
  res.json(list);
});

router.post("/admin/allowed-student-ids", requireRole(["admin"]), async (req, res): Promise<void> => {
  const { studentIds, note } = req.body as { studentIds: string | string[]; note?: string };

  if (!studentIds) {
    res.status(400).json({ error: "Bad Request", message: "학번을 입력해주세요." });
    return;
  }

  const ids = (Array.isArray(studentIds) ? studentIds : [studentIds])
    .map((s: string) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    res.status(400).json({ error: "Bad Request", message: "유효한 학번이 없습니다." });
    return;
  }

  const inserted = [];
  const errors = [];

  for (const studentId of ids) {
    try {
      const [row] = await db.insert(allowedStudentIdsTable)
        .values({ studentId, note: note ?? null })
        .onConflictDoNothing()
        .returning();
      if (row) inserted.push(row);
    } catch {
      errors.push(studentId);
    }
  }

  res.status(201).json({ inserted, errors });
});

router.delete("/admin/allowed-student-ids/:studentId", requireRole(["admin"]), async (req, res): Promise<void> => {
  const studentId = Array.isArray(req.params.studentId) ? req.params.studentId[0] : req.params.studentId;

  const deleted = await db.delete(allowedStudentIdsTable)
    .where(eq(allowedStudentIdsTable.studentId, studentId))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Not Found", message: "해당 학번이 목록에 없습니다." });
    return;
  }

  res.json({ message: "삭제되었습니다." });
});

export default router;
