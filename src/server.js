import "dotenv/config";
import express from "express";
import path from "path";
import safeParseJson from "./utils/jsonParse.js";
import cleanGrades from "./utils/cleaner.js";
import fs from "fs/promises";

import multer from "multer";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.API,
});

const upload = multer({
	  dest: "uploads/"
});

const fakeMode = process.env.FAKEMODE === "true";
const app = express();
app.use(express.static(path.join(process.cwd(), "public/")));
const PORT = process.env.PORT || 3000;
 

 app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/index.html"));
});


// gemeni post 
app.post("/generate", upload.single("image"), async (req, res) => {
  console.log("a request");

  try {
    if (!req.file) {
	const err = "No file uploaded";
      return res.status(400).json({ error: err, message: err  });
    }

    if (req.file.size > 7340032) {
	const err = "Large file";
      return res.status(413).json({ error: err, message: err });
    }

    const imageBuffer = await fs.readFile(req.file.path);

    if (fakeMode) {
      return res.status(200).json({
        data: [[1,2,3],[4,5,6]]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: imageBuffer.toString("base64"),
          },
        },
        {
          text: process.env.prompt,
        },
      ],
    });

    const parsed = safeParseJson(response.text);
	const data = cleanGrades(parsed)

    return res.status(200).json({ data });

  } catch (error) {
    const status = error?.status || error?.code;

    console.error("AI ERROR:", error);
 
 return res.status(429).json({
    error: "RATE_LIMIT",
    message: "You’ve made too many requests. Please wait a moment and try again."
  });
}

if (status === 503) {
  return res.status(503).json({
    error: "AI_UNAVAILABLE",
    message: "AI service is temporarily unavailable. We’ll be back in a moment."
  });
}

return res.status(500).json({
  error: "INTERNAL_ERROR",
  message: "Something went wrong. Our team has been notified. Please try again later."
});

});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
