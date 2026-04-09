import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
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

export default router;
