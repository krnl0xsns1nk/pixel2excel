// src/geminiVision.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

export async function recognizeWithGemini(
  base64Image: string
): Promise<string[][]> {
    const prompt = `
Extract ALL numbers from this table image.
The table may contain handwritten or printed numbers.
Respond STRICTLY with a JSON array of arrays (rows x columns).
No extra text, no explanations, no Markdown.
Empty or unclear cells must be "".
Return only the JSON array.
Example:
[["12","15","18"],["9","14","20"],["11","16","19"]]
`;


  try {
    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image
        }
      }
    ]);

    const text = (await response.response).text().trim();
    alert("text bwfore clean" + JSON.stringify(text));
    // Parse JSON response
    // Remove markdown code fences if present
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    alert("text after clean" + cleaned)
    const tableData: string[][] = JSON.parse(cleaned);
    
    return tableData;
    
  } catch (err) {
    console.error("Gemini API Error:", err);
    return [];
  }
}




export async function testGemini(): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Say hello" }]
          }
        ]
      })
    }
  );

  const data = await response.json();
  return JSON.stringify(data)
}

