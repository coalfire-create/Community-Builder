import { Router, type IRouter } from "express";
import { usersCol, toDate, type FSUser } from "../lib/firestore";
import { UpdateUserRoleBody } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/users", requireRole(["admin"]), async (req, res): Promise<void> => {
  const snap = await usersCol().orderBy("createdAt", "asc").get();

  res.json(snap.docs.map((d) => {
    const u = d.data() as FSUser;
    return {
      id: d.id,
      studentId: u.studentId,
      name: u.name,
      role: u.role,
      createdAt: toDate(u.createdAt),
    };
  }));
});

router.patch("/admin/users/:userId/role", requireRole(["admin"]), async (req, res): Promise<void> => {
  const userId = req.params.userId;

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const doc = await usersCol().doc(userId).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Not Found", message: "사용자를 찾을 수 없습니다." });
    return;
  }

  const user = doc.data() as FSUser;
  if (user.role === "admin") {
    res.status(403).json({ error: "Forbidden", message: "관리자의 권한은 변경할 수 없습니다." });
    return;
  }

  await usersCol().doc(userId).update({ role: parsed.data.role });

  res.json({
    id: userId,
    studentId: user.studentId,
    name: user.name,
    role: parsed.data.role,
    createdAt: toDate(user.createdAt),
  });
});

export default router;
