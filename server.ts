import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI();

  app.post('/api/parse-map', async (req, res) => {
    try {
      const { rawData } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'system',
            parts: [{ text: `You are an expert game data parser and reverse-engineer specializing in classic turn-based strategy binary map formats (specifically Heroes of Might and Magic 1 / .MP1 or .map scenarios). Your task is to process raw map data (hex strings, binary, or unpacked byte arrays) and convert its contents into a structured JSON map layout suitable for consumption by a custom game engine.

OUTPUT JSON SCHEMA:
{
  "scenario": {
    "title": "String",
    "description": "String",
    "dimensions": { "width": "Integer", "height": "Integer" }
  },
  "grid": [
    {
      "x": "Integer",
      "y": "Integer",
      "terrain": "String",
      "overlay": "String|Null"
    }
  ],
  "entities": [
    {
      "id": "String",
      "type": "String",
      "subType": "String",
      "position": { "x": "Integer", "y": "Integer" },
      "owner": "Integer|Null",
      "quantity": "Integer|Null"
    }
  ]
}` }]
          },
          {
            role: 'user',
            parts: [{ text: `Parse this map data into the required JSON schema:\n${rawData}` }]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const jsonResult = JSON.parse(response.text || '{}');
      res.json({ success: true, map: jsonResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
  });
}

startServer();
