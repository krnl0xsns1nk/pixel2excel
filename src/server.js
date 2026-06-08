import "dotenv/config";
import express from "express";
import path from "path";
// import routes from "./routes/route.js";
import fs from "fs/promises";

import multer from "multer";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.API,
});

const upload = multer({
	  dest: "uploads/"
});

const fakeMode = process.env.FAKEMODE || false;
const app = express();
app.use(express.static(path.join(process.cwd(), "public/")));
const PORT = process.env.PORT || 3000;
 

 app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/index.html"));
});

/* app.get("/", (req, res) => {
	res.status(200).json({name: "heheh"})
})*/
app.post(
  "/generate",
  upload.single("image"),
  async (req, res) => {
	  console.log("a requiest")
	  if (!req.file) {
  return res.status(400).json({
    error: "No file uploaded"
  });
}
console.log(req.file);
    const imageBuffer = await fs.readFile(req.file.path);

	if (fakeMode) return res.status(200).json({data : [[1,2,3,4],[1,2,3,4],[1,2,3,4],[1,2,3,4]]});

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
	  console.log(response.text)
function extractJson(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');

  if (start === -1 || end === -1) {
    throw new Error('No JSON array found');
  }

  return text.slice(start, end + 1);
}
	const extractedJson = extractJson(response.text)
	const data = JSON.parse(extractedJson);
    res.status(200).json({
      data
    });

  }
);	
// app.use("/", routes);




app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
