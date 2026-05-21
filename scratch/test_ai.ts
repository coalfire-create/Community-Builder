import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Hello, just reply with '{" + '"verified": true, "reason": "OK"' + "}'",
            },
          ],
        },
      ],
      config: { maxOutputTokens: 512 },
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("AI verification error:", err);
  }
}

test();
