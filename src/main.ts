// src/main.ts
import "../styles/styles.css";

import {
  loadImageToCanvas,
  preprocessFullImage,
  drawDebugGrid
} from "./imageProcessor";

import { renderTable } from "./tableRenderer";
import { exportTableToExcel } from "./excelExporter";

import { recognizeWithGemini, testGemini } from "./geminiVision"; // تعديل هنا
import { canvasToBase64 } from "./utils";

const imageInput = document.getElementById("imageInput") as HTMLInputElement;
const rowsInput = document.getElementById("rows") as HTMLInputElement;
const colsInput = document.getElementById("cols") as HTMLInputElement;
const progressDiv = document.getElementById("progress") as HTMLDivElement;
const dataTable = document.getElementById("dataTable") as HTMLTableElement;
const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
const toggleBtn = document.getElementById("toggleDebug") as HTMLButtonElement;
const debugSection = document.getElementById("debugSection") as HTMLDivElement;

let debugEnabled = false;

// Toggle Debug
toggleBtn.addEventListener("click", () => {
  debugEnabled = !debugEnabled;

  debugSection.style.display = debugEnabled ? "block" : "none";
  toggleBtn.textContent = debugEnabled
    ? "Close Debug"
    : "Enable Debug";
});

// On image selection
imageInput.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const rows = parseInt(rowsInput.value);
  const cols = parseInt(colsInput.value);

  if (!rows || !cols) {
    alert("Please specify number of rows and columns");
    return;
  }

  progressDiv.textContent = "Loading image...";

  // Load image into canvas
  const originalCanvas = await loadImageToCanvas(file);

  // Preprocess (grayscale)
  const processedCanvas = preprocessFullImage(originalCanvas, false);

  // Debug view
  if (debugEnabled) {
    debugSection.innerHTML = "";
    const debugCanvas = drawDebugGrid(processedCanvas, rows, cols);
    debugSection.appendChild(debugCanvas);
  }

  progressDiv.textContent = "Sending image to Gemini...";

  // Convert canvas to base64
  const base64 = canvasToBase64(processedCanvas);
  const result = await testGemini();
    alert(result);

  // Call Gemini API
  const tableData: string[][] = await recognizeWithGemini(base64);

  if (!tableData.length) {
    progressDiv.textContent = "Failed to extract data";
    alert(JSON.stringify(tableData));
    return;
  }

  // Render table
  renderTable(dataTable, tableData);

  progressDiv.textContent = "Finished ✔";
});

// Export Excel
exportBtn.addEventListener("click", () => {
  exportTableToExcel(dataTable, "grades.xlsx");
});
