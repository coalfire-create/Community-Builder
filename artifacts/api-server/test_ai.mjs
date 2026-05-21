import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, reply with 'test ok'",
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
