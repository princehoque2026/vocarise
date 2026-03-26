import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../types";

export const generateDailyWords = async (previousWords: string[] = []): Promise<Word[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment variables.");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const avoidList = previousWords.length > 0 
    ? `IMPORTANT: Avoid these words as they are already learned: ${previousWords.slice(-50).join(", ")}.`
    : "";

  const prompt = `Generate exactly 7 English vocabulary words for a student learning English.
  Distribution: 3 words for B2 level, 2 words for C1 level, 2 words for C2 level.
  Each word must include:
  - word (string)
  - level (B2, C1, or C2)
  - meaning_bn (Bangla meaning)
  - sentence (Simple English sentence using the word)
  - explanation (Short explanation in easy English)

  ${avoidList}
  Ensure the words are useful and commonly used in academic or professional settings.
  Return the result as a JSON array matching the provided schema.`;

  console.log("Fetching daily words from Gemini...");
  
  try {
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

    const text = response.text;
    if (!text) {
      console.error("Gemini returned an empty response.");
      return [];
    }

    const words = JSON.parse(text);
    console.log(`Successfully fetched ${words.length} words.`);
    return words;
  } catch (e) {
    console.error("Failed to fetch or parse Gemini response", e);
    return [];
  }
};
