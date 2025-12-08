import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI (placeholder for future "Smart Stats" or "Category Suggestions")
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_API_KEY' });

export const generateInsight = async (logs: any[]) => {
  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: `Analyze these time logs and give me a 1 sentence encouragement: ${JSON.stringify(logs)}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Keep going! You're doing great.";
  }
};