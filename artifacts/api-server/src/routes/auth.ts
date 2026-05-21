import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { FieldValue, usersCol, toDate, type FSUser } from "../lib/firestore";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { db, allowedStudentIdsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const REQUIRED_DEPARTMENT = "기계시스템공학과";

// 표준 Google AI Studio 키(GEMINI_API_KEY) 우선, Replit 프록시(AI_INTEGRATIONS_GEMINI_API_KEY) 폴백
const geminiApiKey =
  process.env.GEMINI_API_KEY ??
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY ??
  "dummy";

const aiOptions: ConstructorParameters<typeof GoogleGenAI>[0] = {
  apiKey: geminiApiKey,
};

// Replit 프록시 환경에서만 커스텀 baseUrl 적용
if (process.env.AI_INTEGRATIONS_GEMINI_BASE_URL && !process.env.GEMINI_API_KEY) {
  aiOptions.httpOptions = {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  };
}

const ai = new GoogleGenAI(aiOptions);

async function verifyMechanicalEngineeringImage(base64Image: string, studentId: string): Promise<{ verified: boolean; reason: string }> {
  try {
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const mimeType = base64Image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `이 이미지는 학생이 명지대학교 기계시스템공학부(또는 기계공학전공)에 재학 중임을 증명하기 위해 업로드한 모바일 학생정보시스템(MSi) 또는 학생증 화면 스크린샷입니다.
입력한 학번: ${studentId}

이 이미지가 유효한 기계시스템공학부/기계공학과 학생증 또는 학적 화면이며, 입력한 학번과 일치하는지 검증해 주세요.

유효성 확인 가이드라인:
1. **명지대학교 관련 표시**:
   - 이미지에 "명지대학교", "Myongji University", "MSi", "MSI", "학생정보시스템", 또는 "스마트시스템공과대학" 등의 명지대학교 관련 키워드나 로고가 포함되어 있거나,
   - 명지대학교 학번 패턴(보통 60으로 시작하는 8자리 숫자, 예: 60xxxxxx)이 식별되면 유효한 것으로 간주합니다.
2. **소속 학과/학부**:
   - "기계시스템공학과", "기계공학과", "기계시스템공학부", "기계공학전공", 또는 "기계"가 포함된 학과/학부명이 명확히 보여야 합니다. (예: "기계시스템공학부 기계공학전공" 등)
3. **학번 일치**:
   - 이미지에 표시된 학번이 입력한 학번(${studentId})과 일치해야 합니다.

- 위 조건들이 합리적으로 충족되면 verified를 true로 설정하고, 그렇지 않으면 false로 설정해 주세요.
- reason 필드에는 한국어로 판독 결과와 이유를 상세히 적어주세요.`,
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
      config: {
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            verified: { type: "BOOLEAN" },
            reason: { type: "STRING" }
          },
          required: ["verified", "reason"]
        }
      },
    });

    const content = response.text?.trim() ?? "";
    console.log("Gemini raw response:", content);

    if (content) {
      const parsed = JSON.parse(content);
      return {
        verified: !!parsed.verified,
        reason: parsed.reason || ""
      };
    }
    return { verified: false, reason: "응답 내용이 비어 있습니다." };
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
  const grade: string | undefined = (req.body as any).grade;
  const verificationImage: string | undefined = (req.body as any).verificationImage;

  if (department !== REQUIRED_DEPARTMENT) {
    res.status(403).json({
      error: "Forbidden",
      message: "이 커뮤니티는 명지대 기계시스템공학과 학생 전용입니다.",
    });
    return;
  }

  if (!grade || !["1", "2+"].includes(grade)) {
    res.status(400).json({ error: "Bad Request", message: "가입 구분을 선택해주세요." });
    return;
  }

  // 1학년(광역학생)은 전화번호를 studentId로 사용하므로 숫자가 아닌 문자(대시 등)를 제거하여 통일
  let finalStudentId = studentId;
  if (grade === "1") {
    finalStudentId = studentId.replace(/[^0-9]/g, "");
  }

  const existingSnap = await usersCol().where("studentId", "==", finalStudentId).limit(1).get();
  if (!existingSnap.empty) {
    res.status(400).json({
      error: "Bad Request",
      message: grade === "1" ? "이미 존재하는 전화번호입니다." : "이미 존재하는 학번입니다.",
    });
    return;
  }

  // 1학년(공과대학 광역): 사전 등록된 전화번호만 가입 가능
  if (grade === "1") {
    const allowed = await db
      .select()
      .from(allowedStudentIdsTable)
      .where(eq(allowedStudentIdsTable.studentId, finalStudentId))
      .limit(1);

    if (allowed.length === 0) {
      res.status(403).json({
        error: "Forbidden",
        message: "등록되지 않은 광역학생 전화번호입니다. 광역학생은 관리자가 전화번호를 사전 등록해야 가입할 수 있습니다.",
      });
      return;
    }
  }

  // 기계과 학생: 학생카드 이미지 AI 인증 필수
  if (grade === "2+") {
    if (!verificationImage) {
      res.status(403).json({
        error: "Forbidden",
        message: "기계과 학생(광역 제외)은 학생카드 사진 인증이 필요합니다.",
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
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const docRef = usersCol().doc();
  const now = new Date();
  await docRef.set({
    studentId: finalStudentId,
    passwordHash,
    name,
    department,
    grade,
    role: "student",
    createdAt: now,
  });

  req.session.userId = docRef.id;
  req.session.role = "student";

  res.status(201).json({
    user: {
      id: docRef.id,
      studentId: finalStudentId,
      role: "student",
      createdAt: now.toISOString(),
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

  // 광역학생 전화번호 로그인을 위해 입력받은 학번/전화번호에서 대시 등 숫자가 아닌 문자 제거
  let finalStudentId = studentId;
  if (studentId.startsWith("010") || studentId.includes("-")) {
    finalStudentId = studentId.replace(/[^0-9]/g, "");
  }

  const snap = await usersCol().where("studentId", "==", finalStudentId).limit(1).get();
  if (snap.empty) {
    res.status(401).json({ error: "Unauthorized", message: "학번/전화번호 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  const userDoc = snap.docs[0];
  const user = userDoc.data() as FSUser;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "학번/전화번호 또는 비밀번호가 올바르지 않습니다." });
    return;
  }

  req.session.userId = userDoc.id;
  req.session.role = user.role;

  res.json({
    user: {
      id: userDoc.id,
      studentId: user.studentId,
      role: user.role,
      createdAt: toDate(user.createdAt),
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
  const userId = req.session.userId!;
  const doc = await usersCol().doc(userId).get();
  if (!doc.exists) {
    res.status(401).json({ error: "Unauthorized", message: "인증이 필요합니다." });
    return;
  }

  const user = doc.data() as FSUser;
  res.json({
    id: doc.id,
    studentId: user.studentId,
    role: user.role,
    createdAt: toDate(user.createdAt),
  });
});

export default router;
