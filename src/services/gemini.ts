import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateDailyWords = async (previousWords: string[] = []): Promise<Word[]> => {
  const prompt = `Generate 7 English vocabulary words for a student learning English.
  Distribution: 3 words for B2 level, 2 words for C1 level, 2 words for C2 level.
  Each word must include:
  - word (string)
  - level (B2, C1, or C2)
  - meaning_bn (Bangla meaning)
  - sentence (Simple English sentence using the word)
  - explanation (Short explanation in easy English)

  Avoid these words if possible: ${previousWords.join(", ")}.
  Ensure the words are useful and commonly used in academic or professional settings.
  Return the result as a JSON array.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            level: { type: Type.STRING, enum: ["B2", "C1", "C2"] },
            meaning_bn: { type: Type.STRING },
            sentence: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ["word", "level", "meaning_bn", "sentence", "explanation"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
};
