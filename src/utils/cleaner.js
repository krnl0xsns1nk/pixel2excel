export default function cleanGrades(data) {
  return data.map(row =>
    row.map(cell => {
      if (cell === null || cell === undefined) return null;

      const str = String(cell).trim();

      let result;

      // Invalid number
      if (!Number.isFinite(Number(str))) {
        return null;
      }

      // STEP 1
      // Keep quarter grades
      if (
        str === "0.25" ||
        str === "0.50" ||
        str === "0.5" ||
        str === "0.75"
      ) {
        result = Number(str);
      }

      // STEP 2
      // 0.X -> X
      else if (/^0\.[1-9]$/.test(str)) {
        result = Number(str[2]);
      }

      // STEP 3
      // Keep valid 1.25 / 1.5 / 1.75
      else if (
        str === "1.25" ||
        str === "1.50" ||
        str === "1.5" ||
        str === "1.75"
      ) {
        result = Number(str);
      }

      // STEP 4
      // 1.X -> 1X
      else if (/^1\.[1-9]$/.test(str)) {
        result = Number("1" + str[2]);
      }

      // STEP 5
      // Integer > 20 -> insert decimal before last digit
      else if (/^\d+$/.test(str) && Number(str) > 20) {
        result = Number(
          str.slice(0, -1) + "." + str.slice(-1)
        );
      }

      // STEP 6
      // Four digits -> XX.XX
      else if (/^\d{4}$/.test(str)) {
        result = Number(
          str.slice(0, 2) + "." + str.slice(2)
        );
      }

      // STEP 7
      // Example: 290.1 -> 29.01
      else if (/^\d{3}\.\d$/.test(str)) {
        const compact = str.replace(".", "");
        result = Number(
          compact.slice(0, 2) + "." + compact.slice(2)
        );
      }

      // STEP 8
      // Example: 1.208 -> 12.08
      else if (/^\d\.\d{3}$/.test(str)) {
        const compact = str.replace(".", "");
        result = Number(
          compact.slice(0, 2) + "." + compact.slice(2)
        );
      }

      // Keep original
      else {
        result = Number(str);
      }

      // Final validation AFTER corrections
      if (!Number.isFinite(result)) return null;

      if (result < 0 || result > 20) {
        return null;
      }

      return result;
    })
  );
}
