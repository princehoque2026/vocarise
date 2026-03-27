import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing from environment.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

interface Word {
  id: number;
  word: string;
  level: "B2" | "C1" | "C2";
  meaning_bn: string;
  sentence: string;
  day: number;
}

const TOTAL_DAYS = 10;
const WORDS_PER_DAY = 7;
const TOTAL_WORDS = TOTAL_DAYS * WORDS_PER_DAY; // 70

// Distribution: 3 B2, 2 C1, 2 C2 per day
const DAILY_DIST = {
  B2: 3,
  C1: 2,
  C2: 2
};

async function generateBatch(startDay: number, endDay: number, existingWords: string[]): Promise<Word[]> {
  const prompt = `Generate English vocabulary words for days ${startDay} to ${endDay} of a 364-day course.
  For each day, generate exactly 7 words with this distribution:
  - 3 words at B2 level
  - 2 words at C1 level
  - 2 words at C2 level

  Each word must have:
  - word (string)
  - level (B2, C1, or C2)
  - meaning_bn (Bangla meaning)
  - sentence (Natural English sentence using the word)
  - day (The specific day number from ${startDay} to ${endDay})

  IMPORTANT:
  - Words must be UNIQUE and NOT in this list: ${existingWords.slice(-100).join(", ")}
  - Level accuracy is CRITICAL.
  - Bangla meanings should be natural and accurate.
  - Sentences should be clear and contextual.

  Return as a JSON array of objects.`;

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
              day: { type: Type.INTEGER }
            },
            required: ["word", "level", "meaning_bn", "sentence", "day"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error(`Error generating batch for days ${startDay}-${endDay}:`, error);
    return [];
  }
}

async function main() {
  const words: Word[] = [];
  const existingWordStrings: string[] = [];
  const BATCH_SIZE = 5; // 5 days per batch = 35 words. Safe for output limits.
  
  console.log(`Starting generation of ${TOTAL_WORDS} words...`);

  for (let day = 1; day <= TOTAL_DAYS; day += BATCH_SIZE) {
    const endDay = Math.min(day + BATCH_SIZE - 1, TOTAL_DAYS);
    console.log(`Generating days ${day} to ${endDay}...`);
    
    const batch = await generateBatch(day, endDay, existingWordStrings);
    
    // Add IDs and collect words
    batch.forEach((w, index) => {
      const wordWithId = { ...w, id: words.length + 1 };
      words.push(wordWithId);
      existingWordStrings.push(w.word);
    });

    // Save intermediate results
    fs.writeFileSync("words.json", JSON.stringify(words, null, 2));
    console.log(`Progress: ${words.length}/${TOTAL_WORDS} words generated.`);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("Generation complete! words.json is ready.");
}

main();
