import test from "node:test";
import assert from "node:assert";
import cleanGrades from "../src/utils/cleaner.js";

// ───────── HELPERS ─────────

function assertTable(actual, expected) {
  assert.strictEqual(actual.length, expected.length, "Row count mismatch");

  for (let r = 0; r < expected.length; r++) {
    assert.strictEqual(
      actual[r].length,
      expected[r].length,
      `Column mismatch at row ${r}`
    );

    for (let c = 0; c < expected[r].length; c++) {
      assert.strictEqual(
        actual[r][c],
        expected[r][c],
        `Mismatch at [${r}][${c}]`
      );
    }
  }
}

// ───────── TEST 1: BASIC VALID DATA ─────────

test("cleanGrades - keeps valid values unchanged", () => {
  const input = [
    [0, 5, 10, 20],
    [1.5, 2.25, 19, 0.75],
  ];

  const expected = [
    [0, 5, 10, 20],
    [1.5, 2.25, 19, 0.75],
  ];

  assertTable(cleanGrades(input), expected);
});

// ───────── TEST 2: STEP 1 (0.X → X) ─────────

test("cleanGrades - converts 0.X to X", () => {
  const input = [[0.1, 0.2, 0.3, 0.9]];
  const expected = [[1, 2, 3, 9]];

  assertTable(cleanGrades(input), expected);
});

// ───────── TEST 3: STEP 2 (1.X → 1X) ─────────

test("cleanGrades - converts 1.X to 1X (safe cases)", () => {
  const input = [[1.1, 1.3, 1.6, 1.9]];
  const expected = [[11, 13, 16, 19]];

  assertTable(cleanGrades(input), expected);
});

// ───────── TEST 4: STEP 2 EXCEPTIONS ─────────

test("cleanGrades - keeps safe decimals like 1.25, 1.5, 1.75", () => {
  const input = [[1.25, 1.5, 1.75]];
  const expected = [[1.25, 1.5, 1.75]];

  assertTable(cleanGrades(input), expected);
});

// ───────── TEST 5: STEP 3 (>20 fix) ─────────

test("cleanGrades - fixes numbers > 20 (41 → 4.1)", () => {
  const input = [[41, 61, 195]];
  const expected = [[4.1, 6.1, 19.5]];

  assertTable(cleanGrades(input), expected);
});

// ───────── TEST 6: INVALID VALUES ─────────

test("cleanGrades - invalid values become null", () => {
  const input = [["abc", null, undefined, NaN]];
  const expected = [[null, null, null, null]];

  assertTable(cleanGrades(input), expected);
});

// ───────── TEST 7: OUT OF RANGE SAFETY ─────────

test("cleanGrades - rejects values outside 0–20", () => {
  const input = [[21, -5, 999]];
  const expected = [[2.1, null, null]];

  assertTable(cleanGrades(input), expected);
});

// ───────── TEST 8: MIXED REALISTIC OCR INPUT ─────────

test("cleanGrades - mixed OCR-like dataset", () => {
  const input = [
    [0.1, "1.3", 41, 18],
    ["0.9", "1.9", "61", 0.75],
    [19, "abc", 1.25, 195],
  ];

  const expected = [
    [1, 13, 4.1, 18],
    [9, 19, 6.1, 0.75],
    [19, null, 1.25, 19.5],
  ];

  assertTable(cleanGrades(input), expected);
});
