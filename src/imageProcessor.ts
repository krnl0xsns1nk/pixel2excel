export function drawGridOverlay(
  canvas: HTMLCanvasElement,
  rows: number,
  cols: number
) {
  const ctx = canvas.getContext("2d")!;
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellHeight);
    ctx.lineTo(canvas.width, r * cellHeight);
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellWidth, 0);
    ctx.lineTo(c * cellWidth, canvas.height);
    ctx.stroke();
  }
}
// imageProcess.ts

// 1️⃣ تحميل الصورة إلى Canvas
export async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise((res) => (img.onload = res));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);

  return canvas;
}

// 2️⃣ Grayscale للصورة كاملة (بدون threshold افتراضياً)
export function preprocessFullImage(
  canvas: HTMLCanvasElement,
  useThreshold = false,
  threshold = 140
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray =
      0.299 * data[i] +
      0.587 * data[i + 1] +
      0.114 * data[i + 2];

    let value = gray;

    if (useThreshold) {
      value = gray > threshold ? 255 : 0;
    }

    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

// 3️⃣ تقسيم الصورة إلى خلايا
export function splitIntoCells(
  canvas: HTMLCanvasElement,
  rows: number,
  cols: number
): HTMLCanvasElement[][] {
  const cellWidth = Math.floor(canvas.width / cols);
  const cellHeight = Math.floor(canvas.height / rows);

  const cells: HTMLCanvasElement[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: HTMLCanvasElement[] = [];

    for (let c = 0; c < cols; c++) {
      const cellCanvas = document.createElement("canvas");
      cellCanvas.width = cellWidth;
      cellCanvas.height = cellHeight;

      const ctx = cellCanvas.getContext("2d")!;

      ctx.drawImage(
        canvas,
        c * cellWidth,
        r * cellHeight,
        cellWidth,
        cellHeight,
        0,
        0,
        cellWidth,
        cellHeight
      );

      row.push(cellCanvas);
    }

    cells.push(row);
  }

  return cells;
}

// 4️⃣ تكبير الخلية قبل OCR (مهم جداً)
export function upscaleCell(
  canvas: HTMLCanvasElement,
  scale = 3
): HTMLCanvasElement {
  const upCanvas = document.createElement("canvas");
  upCanvas.width = canvas.width * scale;
  upCanvas.height = canvas.height * scale;

  const ctx = upCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(canvas, 0, 0, upCanvas.width, upCanvas.height);

  return upCanvas;
}

// 5️⃣ رسم خطوط Debug فوق الصورة
export function drawDebugGrid(
  canvas: HTMLCanvasElement,
  rows: number,
  cols: number
): HTMLCanvasElement {
  const debugCanvas = document.createElement("canvas");
  debugCanvas.width = canvas.width;
  debugCanvas.height = canvas.height;

  const ctx = debugCanvas.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0);

  const cellWidth = Math.floor(canvas.width / cols);
  const cellHeight = Math.floor(canvas.height / rows);

  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  // رسم خطوط أفقية
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellHeight);
    ctx.lineTo(canvas.width, r * cellHeight);
    ctx.stroke();
  }

  // رسم خطوط عمودية
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellWidth, 0);
    ctx.lineTo(c * cellWidth, canvas.height);
    ctx.stroke();
  }

  return debugCanvas;
}
