import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { FieldValue, usersCol, toDate, type FSUser } from "../lib/firestore";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const REQUIRED_DEPARTMENT = "기계시스템공학과";

const useReplitProxy = !!(
  process.env.AI_INTEGRATIONS_GEMINI_BASE_URL && !process.env.GEMINI_API_KEY
);

const geminiApiKey =
  process.env.GEMINI_API_KEY ??
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY ??
  "dummy";

const aiOptions: ConstructorParameters<typeof GoogleGenAI>[0] = {
  apiKey: geminiApiKey,
};

if (useReplitProxy) {
  aiOptions.httpOptions = {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  };
}

const GEMINI_MODEL = "gemini-2.5-flash";

const ai = new GoogleGenAI(aiOptions);

const GEMINI_TIMEOUT_MS = 20000;

// 모듈 로드 시점에 API 키 상태 출력
console.log("[auth] GEMINI_API_KEY set at init:", !!process.env.GEMINI_API_KEY);
console.log("[auth] AI_INTEGRATIONS_GEMINI_API_KEY set at init:", !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY);
console.log("[auth] effective gemini key source:", process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : process.env.AI_INTEGRATIONS_GEMINI_API_KEY ? "AI_INTEGRATIONS" : "DUMMY");

async function verifyMechanicalEngineeringImage(base64Image: string, _studentId: string): Promise<{ verified: boolean; reason: string }> {
  console.log("[verify] starting AI verification, key source:", process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : process.env.AI_INTEGRATIONS_GEMINI_API_KEY ? "AI_INTEGRATIONS" : "DUMMY");
  try {
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const mimeType = base64Image.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    console.log("[verify] calling Gemini API, mime:", mimeType, "data length:", base64Data.length);

    const geminiCall = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `이 이미지를 분석해주세요.

확인 사항:
1. 이미지에 학생증/학생카드처럼 보이는 내용이 있나요?
2. 이미지 어딘가에 다음 중 하나라도 텍스트가 있나요?
   - "기계시스템공학과"
   - "기계시스템공학부"
   - "기계공학부"
   - "기계공학과"
   - "Mechanical"

반드시 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{"verified": true/false, "reason": "한국어로 간단한 이유"}

verified는 위 텍스트 중 하나라도 이미지에 존재할 때 true입니다.`,
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
        maxOutputTokens: 256,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), GEMINI_TIMEOUT_MS)
    );

    const response = await Promise.race([geminiCall, timeout]);
    console.log("[verify] Gemini API responded successfully");
    const content = response.text?.trim() ?? "";
    console.log("[verify] raw response:", content.slice(0, 200));
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("[verify] parsed result:", parsed);
      return parsed;
    }
    console.warn("[verify] no JSON found in response");
    return { verified: false, reason: "응답 형식 오류" };
  } catch (err: any) {
    if (err?.message === "GEMINI_TIMEOUT") {
      console.error("[verify] timeout after", GEMINI_TIMEOUT_MS, "ms");
      return { verified: false, reason: "인증 서비스 응답 시간 초과. 잠시 후 다시 시도해주세요." };
    }
    console.error("AI verification error type:", err?.constructor?.name);
    console.error("AI verification error message:", err?.message);
    console.error("AI verification error status:", err?.status ?? err?.statusCode);
    console.error("AI verification full error:", JSON.stringify(err, null, 2));
    console.error("[verify] error own-props:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return { verified: false, reason: "인증 서비스 오류. 잠시 후 다시 시도해주세요." };
  }
}

router.post("/auth/register", async (req, res): Promise<void> => {
  console.log("GEMINI_API_KEY set:", !!process.env.GEMINI_API_KEY);
  console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY?.length);
  console.log("AI_INTEGRATIONS_GEMINI_API_KEY set:", !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY);
  try {
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
      res.status(400).json({ error: "Bad Request", message: "학년을 선택해주세요." });
      return;
    }

    const existingSnap = await usersCol().where("studentId", "==", studentId).limit(1).get();
    if (!existingSnap.empty) {
      res.status(400).json({ error: "Bad Request", message: "이미 존재하는 학번입니다." });
      return;
    }

    if (grade === "2+") {
      if (!verificationImage) {
        res.status(403).json({
          error: "Forbidden",
          message: "2학년 이상은 학생카드 사진 인증이 필요합니다.",
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
      studentId,
      passwordHash,
      name,
      department,
      role: "student" as const,
      grade,
      createdAt: now,
    });

    req.session.userId = docRef.id;
    req.session.role = "student";

    res.status(201).json({
      user: {
        id: docRef.id,
        studentId,
        role: "student",
        createdAt: now.toISOString(),
      },
      message: "회원가입이 완료되었습니다.",
    });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "서버 내부 오류가 발생했습니다.", detail: err?.message });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad Request", message: parsed.error.message });
      return;
    }

    const { studentId, password } = parsed.data;

    const snap = await usersCol().where("studentId", "==", studentId).limit(1).get();
    if (snap.empty) {
      res.status(401).json({ error: "Unauthorized", message: "학번 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    const userDoc = snap.docs[0];
    const user = userDoc.data() as FSUser;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "학번 또는 비밀번호가 올바르지 않습니다." });
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
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "서버 내부 오류가 발생했습니다.", detail: err?.message });
  }
});

router.post("/auth/logout", (req, res): void => {
  delete req.session.userId;
  delete req.session.role;
  res.json({ message: "로그아웃되었습니다." });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
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
  } catch (err: any) {
    console.error("Auth me error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "서버 내부 오류가 발생했습니다.", detail: err?.message });
  }
});

export default router;
