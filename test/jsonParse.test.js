import test from "node:test";
import assert from "node:assert";
import { safeParseJson } from "../src/utils/jsonParse.js";

test("parses clean JSON array", () => {
  const input = `
  [
    [1,2,3,4],
    [5,6,7,8]
  ]
  `;

  const result = safeParseJson(input);

  assert.deepStrictEqual(result, [
    [1,2,3,4],
    [5,6,7,8]
  ]);
});

test("parses JSON inside markdown block", () => {
  const input = `
  Here is your result:

  \`\`\`json
  [
    [1,2,3,4],
    [5,6,7,8]
  ]
  \`\`\`
  `;

  const result = safeParseJson(input);

  assert.deepStrictEqual(result, [
    [1,2,3,4],
    [5,6,7,8]
  ]);
});

test("ignores text before and after array", () => {
  const input = `
  Hello 😊

  I analyzed the image.

  [
    [10,11,12,13],
    [14,15,16,17]
  ]

  Thanks for using Gemini!
  `;

  const result = safeParseJson(input);

  assert.deepStrictEqual(result, [
    [10,11,12,13],
    [14,15,16,17]
  ]);
});

test("returns largest array when multiple arrays exist", () => {
  const input = `
  Small array:
  [[1,2]]

  Real result:

  [
    [1,2,3,4],
    [5,6,7,8],
    [9,10,11,12]
  ]

  Backup:
  [[99]]
  `;

  const result = safeParseJson(input);

  assert.strictEqual(result.length, 3);
});

test("handles string values without crashing", () => {
  const input = `
  [
    [1,"2",3],
    [4,"5",6]
  ]
  `;

  const result = safeParseJson(input);

  assert.ok(Array.isArray(result));
});

test("returns null for completely broken response", () => {
  const input = `
  ERROR 503
  MODEL OVERLOADED
  undefined
  null
  html html html
  `;

  const result = safeParseJson(input);

  assert.strictEqual(result, null);
});

test("returns null for empty string", () => {
  const result = safeParseJson("");

  assert.strictEqual(result, null);
});

test("handles nightmare Gemini response", () => {
  const input = `
  Sure! I extracted the table.

  Warning: quality is low.

  \`\`\`json
  [
    [18,0.9,15,1.7],
    [0.3,12,41,17]
  ]
  \`\`\`

  Backup:

  [[1,2],[3,4]]

  Ignore everything above.
  `;

  const result = safeParseJson(input);

  assert.deepStrictEqual(result, [
    [18,0.9,15,1.7],
    [0.3,12,41,17]
  ]);
});
