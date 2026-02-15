import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import { preprocessImage } from './imgPreproces'
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const progressDiv = document.getElementById('progress') as HTMLDivElement;
const rawTextarea = document.getElementById('rawText') as HTMLTextAreaElement;
const convertBtn = document.getElementById('convertToTable') as HTMLButtonElement;
const dataTable = document.getElementById('dataTable') as HTMLTableElement;
const exportBtn = document.getElementById('exportToExcel') as HTMLButtonElement;

// Step 1: OCR
imageInput.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  
  if (!file) {
    return;
  }

  // الحصول على اللغة المختارة
  const selectedLang = (document.querySelector('input[name="language"]:checked') as HTMLInputElement)?.value || 'fra';

  progressDiv.textContent = 'جاري المعالجة...';
  rawTextarea.value = '';
  dataTable.innerHTML = '';
  const processedImage = await preprocessImage(file)
  try {
    const result = await Tesseract.recognize(
      processedImage,
      selectedLang, // استخدام اللغة المختارة
      {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            progressDiv.textContent = `جاري التعرف على النص: ${progress}%`;
          }
        }
      }
    );

    rawTextarea.value = result.data.text;
    progressDiv.textContent = 'تم الانتهاء! الآن عدّل النص ثم اضغط "تحويل إلى جدول"';
    
  } catch (error) {
    progressDiv.textContent = 'حدث خطأ: ' + (error as Error).message;
    console.error(error);
  }
});

// Step 2: Convert text to HTML table
convertBtn.addEventListener('click', () => {
  const text = rawTextarea.value.trim();
  
  if (!text) {
    alert('لا يوجد نص للتحويل!');
    return;
  }

  const lines = text.split('\n').filter(line => line.trim() !== '');
  const data: string[][] = lines.map(line => {
    return line.trim().split(/\s+/);
  });

  dataTable.innerHTML = '';
  
  data.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.textContent = cell;
      td.style.padding = '5px';
      td.style.minWidth = '100px';
      tr.appendChild(td);
    });
    
    dataTable.appendChild(tr);
  });

  progressDiv.textContent = 'الجدول جاهز! عدّل البيانات ثم اضغط "تحميل Excel"';
});

// Step 3: Export to Excel
exportBtn.addEventListener('click', () => {
  if (dataTable.rows.length === 0) {
    alert('لا يوجد جدول للتصدير!');
    return;
  }

  const data: string[][] = [];
  
  for (let i = 0; i < dataTable.rows.length; i++) {
    const row = dataTable.rows[i];
    const rowData: string[] = [];
    
    for (let j = 0; j < row.cells.length; j++) {
      const cellText = (row.cells[j].textContent || '').trim();
      rowData.push(cellText);
    }
    
    if (rowData.some(cell => cell !== '')) {
      data.push(rowData);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  
  XLSX.writeFileXLSX(workbook, 'outiiiiiii.xlsx');
  
  progressDiv.textContent = `تم تحميل الملف! (${data.length} صف)`;
});
