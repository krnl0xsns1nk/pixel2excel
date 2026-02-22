import * as XLSX from "xlsx";

export function exportTableToExcel(
  table: HTMLTableElement,
  filename: string
) {
  const data: string[][] = [];

  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    const rowData: string[] = [];

    for (let j = 0; j < row.cells.length; j++) {
      rowData.push(
        (row.cells[j].textContent || "").trim()
      );
    }

    data.push(rowData);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  XLSX.writeFile(workbook, filename);
}
