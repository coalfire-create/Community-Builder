import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const REQUIRED_DEPARTMENT = "기계시스템공학과";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? "dummy",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

async function verifyMechanicalEngineeringImage(base64Image: string, studentId: string): Promise<{ verified: boolean; reason: string }> {
  try {
    // Strip data URL prefix if present
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const mimeType = base64Image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `이 이미지를 분석해주세요.

확인 사항:
1. 명지대학교 학생정보시스템(MSI, msi.mju.ac.kr)의 학생카드 화면인가요?
2. 학부(과) 항목에 "기계공학부" 또는 "기계시스템" 관련 내용이 표시되어 있나요?
3. 학번 항목에 "${studentId}"가 표시되어 있나요?

반드시 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{"verified": true/false, "reason": "한국어로 간단한 이유"}

verified는 1, 2, 3번 조건이 모두 충족될 때만 true입니다.`,
            },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: { maxOutputTokens: 512 },
    });

    const content = response.text?.trim() ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { verified: false, reason: "응답 형식 오류" };
  } catch (err) {
    console.error("AI verification error:", err);
    return { verified: false, reason: "인증 서비스 오류" };
  }
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: parsed.error.message });
    return;
  }

  const { studentId, password, name, department } = parsed.data;
  const verificationImage: string | undefined = (req.body as any).verificationImage;

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

  // All students must verify via Gemini AI (MSI portal screenshot)
  if (!verificationImage) {
    res.status(403).json({
      error: "Forbidden",
      message: "학생정보시스템(msi.mju.ac.kr) 학생카드 화면 사진 인증이 필요합니다.",
      requiresVerification: true,
    });
    return;
  }

  const result = await verifyMechanicalEngineeringImage(verificationImage, studentId);
  if (!result.verified) {
    res.status(403).json({
      error: "Forbidden",
      message: `사진 인증에 실패했습니다: ${result.reason}`,
      requiresVerification: true,
    });
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

// Check if a student ID is in the pre-approved list (no auth needed)
router.get("/auth/check-student-id", async (req, res): Promise<void> => {
  const studentId = req.query.studentId as string;
  if (!studentId) {
    res.status(400).json({ error: "Bad Request", message: "학번이 필요합니다." });
    return;
  }
  const [allowed] = await db.select().from(allowedStudentIdsTable).where(eq(allowedStudentIdsTable.studentId, studentId));
  res.json({ allowed: !!allowed });
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
