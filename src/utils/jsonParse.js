export default function safeParseJson(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const candidates = [];

  for (let start = 0; start < text.length; start++) {
    if (text[start] !== "[") continue;

    let depth = 0;

    for (let end = start; end < text.length; end++) {
      const char = text[end];

      if (char === "[") depth++;
      if (char === "]") depth--;

      if (depth === 0) {
        const candidate = text.slice(start, end + 1);

        try {
          const parsed = JSON.parse(candidate);

          if (
            Array.isArray(parsed) &&
            parsed.every(row => Array.isArray(row))
          ) {
            candidates.push(parsed);
          }
        } catch {
          // ignore
        }

        break;
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const sizeA = a.reduce((sum, row) => sum + row.length, 0);
    const sizeB = b.reduce((sum, row) => sum + row.length, 0);

    return sizeB - sizeA;
  });

  return candidates[0];
}
