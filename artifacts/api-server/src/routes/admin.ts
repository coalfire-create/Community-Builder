import { Router, type IRouter } from "express";
import { usersCol, toDate, type FSUser } from "../lib/firestore";
import { UpdateUserRoleBody } from "@workspace/api-zod";
import { requireRole } from "../middlewares/requireAuth";
import { db, allowedStudentIdsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/allowed-student-ids", requireRole(["admin"]), async (req, res): Promise<void> => {
  try {
    const list = await db.select().from(allowedStudentIdsTable).orderBy(allowedStudentIdsTable.createdAt);
    res.json(list.map(item => ({
      id: item.id,
      studentId: item.studentId,
      note: item.note,
      createdAt: item.createdAt.toISOString()
    })));
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: "목록을 가져오는 중 오류가 발생했습니다." });
  }
});

router.post("/admin/allowed-student-ids", requireRole(["admin"]), async (req, res): Promise<void> => {
  try {
    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ error: "Bad Request", message: "추가할 학번/전화번호 목록이 올바르지 않습니다." });
      return;
    }

    const inserted: string[] = [];
    for (const studentId of studentIds) {
      let trimmed = studentId.trim();
      if (!trimmed) continue;
      
      if (trimmed.startsWith("010") || trimmed.includes("-")) {
        trimmed = trimmed.replace(/[^0-9]/g, "");
      }
      
      const existing = await db
        .select()
        .from(allowedStudentIdsTable)
        .where(eq(allowedStudentIdsTable.studentId, trimmed))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(allowedStudentIdsTable).values({
          studentId: trimmed,
          note: "광역학생",
        });
        inserted.push(trimmed);
      }
    }

    res.json({ inserted });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: "학번/전화번호를 추가하는 중 오류가 발생했습니다." });
  }
});

router.delete("/admin/allowed-student-ids/:studentId", requireRole(["admin"]), async (req, res): Promise<void> => {
  try {
    let studentId = req.params.studentId;
    if (!studentId) {
      res.status(400).json({ error: "Bad Request", message: "학번/전화번호를 지정해야 합니다." });
      return;
    }

    if (studentId.startsWith("010") || studentId.includes("-")) {
      studentId = studentId.replace(/[^0-9]/g, "");
    }

    await db.delete(allowedStudentIdsTable).where(eq(allowedStudentIdsTable.studentId, studentId));
    res.json({ message: "삭제 완료" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error", message: "학번/전화번호를 삭제하는 중 오류가 발생했습니다." });
  }
});

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
