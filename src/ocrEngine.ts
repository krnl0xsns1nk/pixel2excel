import Tesseract from "tesseract.js";

let worker: Tesseract.Worker | null = null;

async function getWorker() {
  if (!worker) {
    worker = await Tesseract.createWorker("eng");

    await worker.setParameters({
      tessedit_char_whitelist: "0123456789.",
    } as any);
  }

  return worker;
}

export async function recognizeCell(
  canvas: HTMLCanvasElement
): Promise<string> {
  try {
    const w = await getWorker();

    const result = await w.recognize(canvas);

    return cleanNumber(result.data.text);
  } catch {
    return "";
  }
}

function cleanNumber(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);

  if (isNaN(num)) return "";
  if (num < 0 || num > 20) return "";

  return num.toString();
}
