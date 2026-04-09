import bcrypt from "bcryptjs";
import { db, usersTable, postsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  const adminHash = await bcrypt.hash("admin1234", 12);
  const councilHash = await bcrypt.hash("council1234", 12);

  const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.studentId, "admin001"));
  if (existingAdmin.length === 0) {
    await db.insert(usersTable).values({
      studentId: "admin001",
      passwordHash: adminHash,
      name: "관리자",
      department: "기계시스템공학과",
      role: "admin",
    });
    console.log("Admin created: admin001 / admin1234");
  } else {
    console.log("Admin already exists");
  }

  const existingCouncil = await db.select().from(usersTable).where(eq(usersTable.studentId, "council001"));
  let councilId: number;
  if (existingCouncil.length === 0) {
    const [c] = await db.insert(usersTable).values({
      studentId: "council001",
      passwordHash: councilHash,
      name: "학생회원",
      department: "기계시스템공학과",
      role: "council",
    }).returning();
    councilId = c.id;
    console.log("Council created: council001 / council1234");
  } else {
    councilId = existingCouncil[0].id;
    console.log("Council already exists");
  }

  const existingAnnouncement = await db.select().from(postsTable).where(eq(postsTable.type, "announcement"));
  if (existingAnnouncement.length === 0) {
    await db.insert(postsTable).values({
      title: "2025학년도 기계시스템공학과 학생회 환영인사",
      content: "안녕하세요! 명지대학교 기계시스템공학과 학생회입니다.\n\n새 학기를 맞이하여 모든 학우 여러분을 환영합니다. 이 커뮤니티는 우리 학과 학생들의 소통 공간입니다. 공지사항, 학업 정보, 행사 안내 등 다양한 정보를 나눠주세요.\n\n궁금한 점이 있으시면 언제든지 학생회에 문의해 주시기 바랍니다.",
      authorId: councilId,
      type: "announcement",
    });
    console.log("Welcome announcement created");
  }
}

seed()
  .then(() => {
    console.log("Seed completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
