import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const mimeType = "image/png";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "이 이미지를 분석해주세요.\n\n확인 사항:\n1. 이미지 어딘가에 명지대학교 관련 정보가 있나요?\n2. 이미지 어딘가에 '기계시스템공학과' 텍스트가 존재하나요?\n\n반드시 JSON 형식으로만 답변하세요:\n{\"verified\": true/false, \"reason\": \"이유\"}"
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
    console.log("Response:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
