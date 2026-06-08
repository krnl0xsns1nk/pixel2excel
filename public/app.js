/**
 * Pixel2Excel — app.js
 * All frontend logic: file handling, API, table, editing, export
 */

'use strict';

/* ─── DOM REFS ─── */
const $ = id => document.getElementById(id);

const uploadZone        = $('uploadZone');
const fileInput         = $('fileInput');
const imagePreviewCont  = $('imagePreviewContainer');
const imagePreview      = $('imagePreview');
const imageFileMeta     = $('imageFileMeta');
const removeImageBtn    = $('removeImageBtn');

const generateBtn       = $('generateBtn');
const exportCsvBtn      = $('exportCsvBtn');
const exportXlsxBtn     = $('exportXlsxBtn');

const statusIndicator   = $('statusIndicator');
const statusText        = $('statusText');

const emptyState        = $('emptyState');
const loadingState      = $('loadingState');
const tableWrapper      = $('tableWrapper');
const tableBody         = $('tableBody');
const tableFooter       = $('tableFooter');
const tableMeta         = $('tableMeta');

const undoBtn           = $('undoBtn');
const redoBtn           = $('redoBtn');
const addRowBtn         = $('addRowBtn');
const addColBtn         = $('addColBtn');

const toastContainer    = $('toastContainer');

/* ─── APP STATE ─── */
const state = {
  file: null,
  tableData: [],          // current 2D array
  undoStack: [],          // array of 2D array snapshots
  redoStack: [],
  changedCells: new Set(), // "row,col" keys
  isLoading: false,
};

/* ─── FILE HANDLING ─── */

// uploadZone is now a <label for="fileInput"> — clicking it natively opens the dialog.
// We only need keyboard support and drag-and-drop.
uploadZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  e.stopPropagation();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', e => {
  e.stopPropagation();
  if (!uploadZone.contains(e.relatedTarget)) {
    uploadZone.classList.remove('drag-over');
  }
});

uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  e.stopPropagation();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleFile(file);
  } else {
    showToast('Please drop an image file (PNG, JPG, WEBP).', 'warning');
  }
});

removeImageBtn.addEventListener('click', e => {
  e.stopPropagation();
  clearFile();
});

function handleFile(file) {
  const MAX_MB = 10;
  if (file.size > MAX_MB * 1024 * 1024) {
    showToast(`File too large. Maximum size is ${MAX_MB}MB.`, 'error');
    return;
  }

  state.file = file;
  uploadZone.classList.add('has-file');

  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    imagePreview.alt = `Preview: ${file.name}`;
    imagePreviewCont.hidden = false;
    imageFileMeta.textContent = `${file.name}  ·  ${formatBytes(file.size)}`;
  };
  reader.readAsDataURL(file);

  generateBtn.disabled = false;
  setStatus('ready', `Image loaded: ${truncate(file.name, 28)}`);
}

function clearFile() {
  state.file = null;
  uploadZone.classList.remove('has-file');
  imagePreviewCont.hidden = true;
  imagePreview.src = '';
  imageFileMeta.textContent = '';
  fileInput.value = '';
  generateBtn.disabled = true;
  setStatus('idle', 'Ready. Upload an image to begin.');
}

/* ─── GENERATE ─── */

generateBtn.addEventListener('click', runGenerate);

async function runGenerate() {
  if (!state.file || state.isLoading) return;

  state.isLoading = true;
  setStatus('loading', 'Analyzing image…');
  setLoadingMessage('Detecting table structure and extracting cell values');
  showPanel('loading');
  setGenerateLoading(true);

  // Build FormData — append the raw File object under the key 'image'
  // matching the backend's upload.single("image")
  const formData = new FormData();
  formData.append('image', state.file, state.file.name);

  try {
    const response = await fetch('/generate', {
      method: 'POST',
      // Do NOT set Content-Type manually — the browser sets it with the correct boundary
      body: formData,
    });
    if (!response.ok) {
      let errMsg = `Server error ${response.status}`;
      try { const e = await response.json(); errMsg = e.error || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    const table = parseTableResponse(data);

    if (!table || table.length === 0) {
      throw new Error('No table data returned from server.');
    }

    state.tableData = deepClone(table);
    state.undoStack = [];
    state.redoStack = [];
    state.changedCells.clear();

    renderTable(state.tableData);
    showPanel('table');
    enableTableControls(true);
    setStatus('success', `Table ready — ${table.length} rows × ${table[0].length} cols`);
    updateTableMeta();
    showToast(`Table extracted: ${table.length} rows, ${table[0].length} columns`, 'success');

  } catch (err) {
	  console.log('[Pixel2Excel] Generate error 1:', err);
    showPanel('empty');
    setStatus('error', `Error: ${err.message}`);
    showToast(err.message, 'error');
  } finally {
    state.isLoading = false;
    setGenerateLoading(false);
  }
}

function parseTableResponse(data) {
  // Accept array-of-arrays directly, or wrapped in a key
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.table)) return data.table;
  if (data && Array.isArray(data.data))  return data.data;
  if (data && Array.isArray(data.rows))  return data.rows;
  throw new Error('Unexpected response format from server.');
}

/* ─── TABLE RENDERING ─── */

function renderTable(data) {
  tableBody.innerHTML = '';

  const colCount = Math.max(...data.map(r => r.length), 0);

  // Build header row (col letters A, B, C…)
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Corner cell
  const cornerTh = document.createElement('th');
  cornerTh.className = 'row-num';
  cornerTh.setAttribute('aria-label', 'Row number');
  headerRow.appendChild(cornerTh);

  for (let c = 0; c < colCount; c++) {
    const th = document.createElement('th');
    th.textContent = colIndexToLetter(c);
    th.setAttribute('scope', 'col');
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  // Insert thead before tbody — need to target the table element
  const table = document.getElementById('gradeTable');
  const existingThead = table.querySelector('thead');
  if (existingThead) existingThead.remove();
  table.insertBefore(thead, tableBody);

  // Build body rows
  data.forEach((row, ri) => {
    const tr = document.createElement('tr');
    tr.dataset.row = ri;

    // Row number cell
    const numTd = document.createElement('td');
    numTd.className = 'row-num';
    numTd.textContent = ri + 1;
    numTd.setAttribute('aria-label', `Row ${ri + 1}`);
    tr.appendChild(numTd);

    // Data cells (pad to colCount)
    for (let ci = 0; ci < colCount; ci++) {
      const td = document.createElement('td');
      td.dataset.row = ri;
      td.dataset.col = ci;

      const content = document.createElement('span');
      content.className = 'cell-content';
      content.contentEditable = 'true';
      content.spellcheck = false;
      content.setAttribute('role', 'gridcell');
      content.setAttribute('aria-label', `Row ${ri + 1}, Column ${colIndexToLetter(ci)}`);

      const cellValue = row[ci] != null ? String(row[ci]) : '';
      content.textContent = cellValue;

      if (state.changedCells.has(`${ri},${ci}`)) {
        content.classList.add('changed');
      }

      // Cell editing events
      content.addEventListener('keydown', onCellKeydown);
      content.addEventListener('blur', onCellBlur);
      content.addEventListener('focus', onCellFocus);
      content.addEventListener('paste', onCellPaste);

      td.appendChild(content);
      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  });

  updateTableFooter();
}

/* ─── CELL EDITING ─── */

let activeCellBefore = null; // value before edit starts

function onCellFocus(e) {
  activeCellBefore = e.target.textContent;
  // Select all on focus for quick overwrite
  const range = document.createRange();
  range.selectNodeContents(e.target);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function onCellBlur(e) {
  const cell = e.target;
  const newVal = cell.textContent;
  if (newVal !== activeCellBefore) {
    const td = cell.parentElement;
    const ri = parseInt(td.dataset.row, 10);
    const ci = parseInt(td.dataset.col, 10);
    commitCellEdit(ri, ci, activeCellBefore, newVal);
  }
  activeCellBefore = null;
}

function onCellKeydown(e) {
  const cell = e.target;
  const td = cell.parentElement;
  const ri = parseInt(td.dataset.row, 10);
  const ci = parseInt(td.dataset.col, 10);
  const rows = tableBody.querySelectorAll('tr');
  const cols = rows[0] ? rows[0].querySelectorAll('td[data-col]').length : 0;

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    cell.blur();
    // Move to next row, same column
    const nextRow = rows[ri + 1];
    if (nextRow) {
      const nextCell = nextRow.querySelector(`td[data-col="${ci}"] .cell-content`);
      if (nextCell) nextCell.focus();
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    cell.blur();
    const nextCi = e.shiftKey ? ci - 1 : ci + 1;
    if (nextCi >= 0 && nextCi < cols) {
      const nextCell = rows[ri].querySelector(`td[data-col="${nextCi}"] .cell-content`);
      if (nextCell) nextCell.focus();
    } else if (!e.shiftKey && ri + 1 < rows.length) {
      const nextCell = rows[ri + 1].querySelector(`td[data-col="0"] .cell-content`);
      if (nextCell) nextCell.focus();
    }
  } else if (e.key === 'Escape') {
    cell.textContent = activeCellBefore;
    cell.blur();
  } else if (e.key === 'ArrowUp' && !e.shiftKey && window.getSelection().toString() === '') {
    e.preventDefault();
    const prevRow = rows[ri - 1];
    if (prevRow) {
      const prevCell = prevRow.querySelector(`td[data-col="${ci}"] .cell-content`);
      if (prevCell) prevCell.focus();
    }
  } else if (e.key === 'ArrowDown' && !e.shiftKey && window.getSelection().toString() === '') {
    e.preventDefault();
    const nextRow = rows[ri + 1];
    if (nextRow) {
      const nextCell = nextRow.querySelector(`td[data-col="${ci}"] .cell-content`);
      if (nextCell) nextCell.focus();
    }
  }
}

function onCellPaste(e) {
  // Strip HTML from paste — plain text only
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
}

function commitCellEdit(ri, ci, oldVal, newVal) {
  // Push undo snapshot before mutation
  pushUndo();

  state.tableData[ri][ci] = newVal;
  state.changedCells.add(`${ri},${ci}`);

  // Mark cell visually
  const cell = tableBody.querySelector(`tr[data-row="${ri}"] td[data-col="${ci}"] .cell-content`);
  if (cell) cell.classList.add('changed');

  updateTableFooter();
  updateRedoUndoBtns();
}

/* ─── UNDO / REDO ─── */

function pushUndo() {
  state.undoStack.push(deepClone(state.tableData));
  if (state.undoStack.length > 100) state.undoStack.shift(); // cap at 100
  state.redoStack = []; // new edit clears redo
  updateRedoUndoBtns();
}

function undo() {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(deepClone(state.tableData));
  state.tableData = state.undoStack.pop();
  renderTable(state.tableData);
  updateRedoUndoBtns();
  showToast('Undo applied.', 'info');
}

function redo() {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(deepClone(state.tableData));
  state.tableData = state.redoStack.pop();
  renderTable(state.tableData);
  updateRedoUndoBtns();
  showToast('Redo applied.', 'info');
}

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

document.addEventListener('keydown', e => {
  const active = document.activeElement;
  const isEditing = active && active.classList.contains('cell-content');
  if (isEditing) return; // let cell handle its own keys

  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
  }
});

function updateRedoUndoBtns() {
  undoBtn.disabled = state.undoStack.length === 0;
  redoBtn.disabled = state.redoStack.length === 0;
}

/* ─── ADD ROW / COLUMN ─── */

addRowBtn.addEventListener('click', () => {
  if (state.tableData.length === 0) return;
  pushUndo();
  const colCount = state.tableData[0].length;
  state.tableData.push(Array(colCount).fill(''));
  renderTable(state.tableData);
  updateTableMeta();
  // Focus first cell of new row
  const rows = tableBody.querySelectorAll('tr');
  const lastRow = rows[rows.length - 1];
  if (lastRow) {
    const firstCell = lastRow.querySelector('.cell-content');
    if (firstCell) { firstCell.focus(); firstCell.scrollIntoView({ block: 'nearest' }); }
  }
});

addColBtn.addEventListener('click', () => {
  if (state.tableData.length === 0) return;
  pushUndo();
  state.tableData.forEach(row => row.push(''));
  renderTable(state.tableData);
  updateTableMeta();
});

/* ─── EXPORT: CSV ─── */

exportCsvBtn.addEventListener('click', exportCsv);

function exportCsv() {
  if (state.tableData.length === 0) return;

  syncDOMToState();

  const csvLines = state.tableData.map(row =>
    row.map(cell => csvEscapeCell(cell)).join(',')
  );
  const csv = csvLines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, generateFilename('csv'));
  showToast('CSV downloaded successfully.', 'success');
}

function csvEscapeCell(val) {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/* ─── EXPORT: XLSX ─── */

exportXlsxBtn.addEventListener('click', exportXlsx);

async function exportXlsx() {
  if (state.tableData.length === 0) return;

  syncDOMToState();

  try {
    // Build minimal XLSX from scratch (no external library required)
    const xlsxBlob = buildXlsx(state.tableData);
    triggerDownload(xlsxBlob, generateFilename('xlsx'));
    showToast('XLSX downloaded successfully.', 'success');
  } catch (err) {
    console.log('[Pixel2Excel] XLSX export error:', err);
    showToast('XLSX export failed. Try CSV instead.', 'error');
  }
}

/**
 * Build a minimal but valid .xlsx file using the Open XML spec.
 * No external dependencies — pure JS with base64 encoding.
 */
function buildXlsx(data) {
  // We'll produce a valid xlsx using a hand-crafted structure
  const rows = data.map((row, ri) => {
    const cells = row.map((val, ci) => {
      const colLetter = colIndexToLetter(ci);
      const cellRef   = `${colLetter}${ri + 1}`;
      const escaped   = xmlEsc(val == null ? '' : String(val));

      // Detect number
      const num = parseFloat(val);
      if (val !== '' && !isNaN(num) && isFinite(num)) {
        return `<c r="${cellRef}"><v>${num}</v></c>`;
      }
      return `<c r="${cellRef}" t="inlineStr"><is><t>${escaped}</t></is></c>`;
    });
    return `<row r="${ri + 1}">${cells.join('')}</row>`;
  });

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows.join('')}</sheetData>
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Grades" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"
  Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1"
  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
  Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml"  ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml"
  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml"
  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  // Pack into ZIP (XLSX is a ZIP)
  const files = {
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': workbookRelsXml,
    'xl/workbook.xml': workbookXml,
    'xl/_rels/workbook.xml.rels': relsXml,
    'xl/worksheets/sheet1.xml': sheetXml,
  };

  return zipFiles(files);
}

/* ─── MINIMAL ZIP BUILDER ─── */

function zipFiles(fileMap) {
  // Build a ZIP with no compression (stored), pure ArrayBuffer
  const encoder = new TextEncoder();
  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const [name, content] of Object.entries(fileMap)) {
    const nameBytes    = encoder.encode(name);
    const dataBytes    = encoder.encode(content);
    const crc          = crc32(dataBytes);
    const localHeader  = buildLocalHeader(nameBytes, dataBytes.length, crc);

    parts.push(localHeader, dataBytes);

    centralDir.push(buildCentralHeader(nameBytes, dataBytes.length, crc, offset));
    offset += localHeader.byteLength + dataBytes.byteLength;
  }

  const centralDirBytes = concat(...centralDir);
  const eocd = buildEOCD(Object.keys(fileMap).length, centralDirBytes.byteLength, offset);
  const result = concat(...parts, centralDirBytes, eocd);
  return new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function buildLocalHeader(nameBytes, dataLen, crc) {
  const buf = new ArrayBuffer(30 + nameBytes.length);
  const v = new DataView(buf);
  v.setUint32(0,  0x504B0304, false); // signature LE
  v.setUint16(4,  20, true);          // version
  v.setUint16(6,  0, true);           // flags
  v.setUint16(8,  0, true);           // no compression
  v.setUint16(10, 0, true);           // mod time
  v.setUint16(12, 0, true);           // mod date
  v.setUint32(14, crc >>> 0, true);
  v.setUint32(18, dataLen, true);
  v.setUint32(22, dataLen, true);
  v.setUint16(26, nameBytes.length, true);
  v.setUint16(28, 0, true);
  new Uint8Array(buf, 30).set(nameBytes);
  return buf;
}

function buildCentralHeader(nameBytes, dataLen, crc, localOffset) {
  const buf = new ArrayBuffer(46 + nameBytes.length);
  const v = new DataView(buf);
  v.setUint32(0,  0x504B0102, false);
  v.setUint16(4,  20, true);
  v.setUint16(6,  20, true);
  v.setUint16(8,  0, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, 0, true);
  v.setUint16(14, 0, true);
  v.setUint32(16, crc >>> 0, true);
  v.setUint32(20, dataLen, true);
  v.setUint32(24, dataLen, true);
  v.setUint16(28, nameBytes.length, true);
  v.setUint16(30, 0, true);
  v.setUint16(32, 0, true);
  v.setUint16(34, 0, true);
  v.setUint16(36, 0, true);
  v.setUint32(38, 0, true);
  v.setUint32(42, localOffset, true);
  new Uint8Array(buf, 46).set(nameBytes);
  return buf;
}

function buildEOCD(numFiles, cdSize, cdOffset) {
  const buf = new ArrayBuffer(22);
  const v = new DataView(buf);
  v.setUint32(0,  0x504B0506, false);
  v.setUint16(4,  0, true);
  v.setUint16(6,  0, true);
  v.setUint16(8,  numFiles, true);
  v.setUint16(10, numFiles, true);
  v.setUint32(12, cdSize, true);
  v.setUint32(16, cdOffset, true);
  v.setUint16(20, 0, true);
  return buf;
}

function concat(...buffers) {
  const total = buffers.reduce((sum, b) => sum + (b.byteLength || b.length), 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const b of buffers) {
    out.set(b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b), pos);
    pos += b.byteLength || b.length;
  }
  return out;
}

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/* ─── SYNC DOM → STATE ─── */
// Read current cell values from the DOM into state.tableData before export
function syncDOMToState() {
  const rows = tableBody.querySelectorAll('tr');
  rows.forEach((tr, ri) => {
    const cells = tr.querySelectorAll('td[data-col] .cell-content');
    cells.forEach((cell, ci) => {
      if (state.tableData[ri]) {
        state.tableData[ri][ci] = cell.textContent;
      }
    });
  });
}

/* ─── UI STATE HELPERS ─── */

function showPanel(panel) {
  emptyState.hidden   = panel !== 'empty';
  loadingState.hidden = panel !== 'loading';
  tableWrapper.hidden = panel !== 'table';

  if (panel === 'table') {
    tableWrapper.classList.add('animating');
    setTimeout(() => tableWrapper.classList.remove('animating'), 350);
  }
}

function setStatus(state, msg) {
  statusIndicator.dataset.state = state;
  statusText.textContent = msg;
}

function setGenerateLoading(loading) {
  if (loading) {
    generateBtn.classList.add('loading');
    generateBtn.querySelector('.btn__label').textContent = 'Analyzing…';
    generateBtn.querySelector('.btn__icon').innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>`;
    generateBtn.disabled = true;
  } else {
    generateBtn.classList.remove('loading');
    generateBtn.querySelector('.btn__label').textContent = 'Generate Table';
    generateBtn.querySelector('.btn__icon').innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>`;
    generateBtn.disabled = !state.file;
  }
}

function setLoadingMessage(msg) {
  const sub = $('loadingSubText');
  if (sub) sub.textContent = msg;
}

function enableTableControls(enabled) {
  exportCsvBtn.disabled  = !enabled;
  exportXlsxBtn.disabled = !enabled;
  addRowBtn.disabled     = !enabled;
  addColBtn.disabled     = !enabled;
  updateRedoUndoBtns();
}

function updateTableMeta() {
  if (state.tableData.length === 0) { tableMeta.textContent = ''; return; }
  const rows = state.tableData.length;
  const cols = state.tableData[0].length;
  tableMeta.textContent = `${rows} rows × ${cols} columns`;
}

function updateTableFooter() {
  if (state.tableData.length === 0) { tableFooter.textContent = ''; return; }
  const rows = state.tableData.length;
  const cols = state.tableData[0] ? state.tableData[0].length : 0;
  const changed = state.changedCells.size;
  tableFooter.innerHTML = `
    <span class="table-footer__stat"><span>${rows}</span> rows</span>
    <span class="table-footer__stat"><span>${cols}</span> cols</span>
    ${changed > 0 ? `<span class="table-footer__stat" style="color:var(--accent)"><span>${changed}</span> edited</span>` : ''}
    <span class="table-footer__stat" style="margin-left:auto">Click any cell to edit · Tab / Enter to navigate</span>
  `;
  updateTableMeta();
}

/* ─── TOAST ─── */

function showToast(message, type = 'info') {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type} toast--entering`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__msg">${escapeHtml(message)}</span>
  `;
  toastContainer.appendChild(toast);

  // Trigger enter transition on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.remove('toast--entering');
    });
  });

  const DURATION = type === 'error' ? 5000 : 3000;

  setTimeout(() => {
    toast.classList.add('toast--exit');
    // Remove from DOM after transition finishes (300ms)
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }, DURATION);
}

/* ─── DOWNLOAD TRIGGER ─── */

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function generateFilename(ext) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `grade-table-${ts}.${ext}`;
}

/* ─── UTILITY ─── */

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function colIndexToLetter(i) {
  let result = '';
  let n = i;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncate(str, len) {
  return str.length <= len ? str : str.slice(0, len - 1) + '…';
}

function xmlEsc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

/* ─── INIT ─── */
showPanel('empty');
setStatus('idle', 'Ready. Upload an image to begin.');
enableTableControls(false);
updateRedoUndoBtns();

// Prevent accidental navigation if user has edited cells
window.addEventListener('beforeunload', e => {
  if (state.changedCells.size > 0) {
    e.preventDefault();
    e.returnValue = 'You have unsaved edits. Are you sure you want to leave?';
  }
});

