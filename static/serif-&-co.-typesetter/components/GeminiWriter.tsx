import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { CardContent } from '../types';

interface GeminiWriterProps {
  content: CardContent;
  onUpdate: (newContent: Partial<CardContent>) => void;
}

export const GeminiWriter: React.FC<GeminiWriterProps> = ({ content, onUpdate }) => {
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImprove = async () => {
    if (!process.env.API_KEY) {
      setError("API Key not found. Please set environment variable.");
      return;
    }

    setIsImproving(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        You are a professional magazine editor for a Chinese lifestyle publication. 
        Rewrite the following text content to be more elegant, engaging, and suitable for a high-end magazine.
        
        Guidelines:
        1. Keep the meaning but improve flow and vocabulary (use elegant Chinese).
        2. Do NOT generate a title.
        3. Return the result strictly as a JSON object with key "body".

        Input Body: ${content.body}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      
      const text = response.text;
      if (text) {
        const result = JSON.parse(text);
        onUpdate({
            body: result.body || content.body
        });
      }

    } catch (err) {
      console.error("Gemini Error:", err);
      setError("Failed to improve text. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleImprove}
        disabled={isImproving}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-md shadow-sm transition-all text-sm font-medium disabled:opacity-50"
      >
        {isImproving ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
        {isImproving ? 'AI 润色内容' : 'AI 智能润色'}
      </button>
      {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        Powered by Gemini. 自动优化中文文案风格。
      </p>
    </div>
  );
};
