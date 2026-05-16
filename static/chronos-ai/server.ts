import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Timeline Reflection
  app.post("/api/reflect", async (req, res) => {
    try {
      const { timeline } = req.body;
      if (!timeline) {
        return res.status(400).json({ error: "No timeline provided" });
      }

      const prompt = `你叫 Chronos，是一个优雅、敏锐且带有一点哲理的 AI 伴侣，负责管理用户的时间。
请回顾以下用户今天的时间安排完成情况。请必须用中文回复：
1. 用一两句话对用户这一天的时间花费给出一个总体的印象或富有哲理的评价。请直接对用户说话（例如：“我看到你花了很多时间...”）。
2. 针对具体的时间线项目给出一系列批注。给出简短、有见地或鼓励性的中文反馈（每个最多一句话）。

时间线数据：
${JSON.stringify(timeline, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallImpression: {
                type: Type.STRING,
                description: "Concise philosophical thought or overall impression of the day.",
              },
              annotations: {
                type: Type.ARRAY,
                items: {
                   type: Type.OBJECT,
                   properties: {
                     itemId: {
                       type: Type.STRING,
                       description: "The id of the timeline item this annotation corresponds to."
                     },
                     comment: {
                       type: Type.STRING,
                       description: "A brief, thoughtful comment about this specific activity."
                     }
                   },
                   required: ["itemId", "comment"]
                }
              }
            },
            required: ["overallImpression", "annotations"]
          }
        }
      });
      
      const text = response.text;
      if (!text) {
        throw new Error("No response generated from Gemini");
      }
      
      const evaluation = JSON.parse(text);
      res.json(evaluation);

    } catch (error: any) {
      console.error("AI Evaluation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Express v4 approach for static routing
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
