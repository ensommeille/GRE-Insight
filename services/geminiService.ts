import { GoogleGenAI, Type } from "@google/genai";
import { GREWordData, AnalyzedWord } from "../types";

// NOTE: In a production environment, never expose the key on the client side directly like this unless restricted by Referrer.
// The instruction requires using process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-flash';

const wordSchema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    wasCorrected: { type: Type.BOOLEAN, description: "Set to true if the input was misspelled and you analyzed the corrected word. False otherwise." },
    phonetic: { type: Type.STRING, description: "IPA phonetic transcription, e.g., /.../" },
    partOfSpeech: { type: Type.STRING },
    definition: { type: Type.STRING, description: "Concise Chinese definition" },
    greContext: {
      type: Type.OBJECT,
      properties: {
        explanation: { type: Type.STRING, description: "Explanation of the word's specific meaning/usage in GRE contexts" },
        sentenceEn: { type: Type.STRING, description: "GRE-style example sentence in English" },
        sentenceCn: { type: Type.STRING, description: "Translation of the example sentence" },
      },
      required: ["explanation", "sentenceEn", "sentenceCn"],
    },
    etymology: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING, description: "Source language and original form (Must be in Chinese)" },
        structure: { type: Type.STRING, description: "Roots, prefixes, suffixes breakdown (Must be in Chinese)" },
        logic: { type: Type.STRING, description: "How the roots lead to the current meaning (Must be in Chinese)" },
      },
      required: ["origin", "structure", "logic"],
    },
    mnemonic: { type: Type.STRING, description: "Visual or scenario-based memory aid" },
    cognates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          pos: { type: Type.STRING },
          meaning: { type: Type.STRING },
        },
        required: ["word", "pos", "meaning"],
      },
    },
    synonyms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: { type: Type.STRING, description: "Brief Chinese meaning" },
        },
        required: ["word", "meaning"],
      },
    },
    antonyms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: { type: Type.STRING, description: "Brief Chinese meaning" },
        },
        required: ["word", "meaning"],
      },
    },
  },
  required: [
    "word", "wasCorrected", "phonetic", "partOfSpeech", "definition",
    "greContext", "etymology", "mnemonic",
    "cognates", "synonyms", "antonyms"
  ],
};

const analyzerSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      definition: { type: Type.STRING, description: "Brief 3-4 word definition in Chinese" }
    },
    required: ["word", "definition"]
  }
};

const randomWordSchema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "A single GRE-level English word" }
  },
  required: ["word"]
};

export const fetchWordData = async (word: string): Promise<GREWordData> => {
  const prompt = `
    Analyze the English word "${word}" for a GRE vocabulary student.
    
    CRITICAL INSTRUCTION ON SPELLING:
    1. Verify if "${word}" is a valid English word.
    2. If it is misspelled or not a valid word, identify the closest VALID GRE vocabulary word (e.g., if input is "abondon", analyze "abandon").
    3. If you correct the word, set the "wasCorrected" field to TRUE, and put the CORRECT word in the "word" field.
    4. If the input is valid, set "wasCorrected" to FALSE.
    5. Do NOT hallucinate definitions for gibberish. If completely unrecognizable, correct it to the most likely word.

    Requirements for Content:
    - Definition should be concise and in Chinese.
    - GRE Context: Focus on the specific nuance, logic, or tone used in GRE exams.
    - Etymology: Break down roots clearly. 
      IMPORTANT: The 'origin', 'structure', and 'logic' fields MUST be in Chinese. 
      STRICTLY PLAIN TEXT ONLY. Do NOT use markdown symbols like *, **, _, or bolding in these fields. 
      Example: "from Latin" NOT "*from Latin*".
    - Mnemonic: Be creative and visual.
    - Cognates: List 3-5 related words sharing the same root.
    - Synonyms/Antonyms: List 3-5 high-frequency GRE words with Chinese meanings.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: wordSchema,
      temperature: 0.3, 
    },
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  try {
    const data = JSON.parse(response.text) as GREWordData;
    data.timestamp = Date.now();
    
    // Attach original query for UI to show "Did you mean...?"
    data.originalQuery = word;

    // Double check correction logic on client side if model missed it (optional safeguard)
    if (data.word.toLowerCase().trim() !== word.toLowerCase().trim()) {
      data.wasCorrected = true;
    }

    // Initialize empty stats for new words
    data.stats = {
      reviews: 0,
      correctCount: 0,
      incorrectCount: 0,
      masteryScore: 0,
      lastReviewed: 0
    };
    return data;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("Failed to parse word data");
  }
};

export const analyzeTextForGRE = async (text: string): Promise<AnalyzedWord[]> => {
  const prompt = `
    Analyze the following text and identify Advanced GRE-level vocabulary words.
    Return a list of the identified words with very brief Chinese definitions (max 4 words).
    Ignore common, basic English words.
    
    Text: "${text.substring(0, 1000)}"
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analyzerSchema,
      temperature: 0.2,
    },
  });

  if (!response.text) return [];

  try {
    return JSON.parse(response.text) as AnalyzedWord[];
  } catch (e) {
    console.error("Analysis failed", e);
    return [];
  }
};

export const fetchRandomGREWord = async (excludedWords: string[]): Promise<string> => {
  const prompt = `
    Suggest ONE difficult, high-frequency GRE vocabulary word.
    Do NOT choose any of these words: ${excludedWords.slice(0, 50).join(', ')}.
    Return strictly JSON.
  `;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: randomWordSchema,
      temperature: 1.0, // High temperature for variety
    },
  });

  if (!response.text) throw new Error("Failed to get random word");

  try {
    const data = JSON.parse(response.text) as { word: string };
    return data.word;
  } catch (e) {
    throw new Error("Failed to parse random word");
  }
};