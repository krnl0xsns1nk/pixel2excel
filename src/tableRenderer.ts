export function renderTable(
  table: HTMLTableElement,
  data: string[][]
) {
  table.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    row.forEach((cell) => {
      const td = document.createElement("td");
      td.contentEditable = "true";
      td.textContent = cell;
      td.style.padding = "5px";
      td.style.minWidth = "80px";
      tr.appendChild(td);
    });

    table.appendChild(tr);
  });
}
