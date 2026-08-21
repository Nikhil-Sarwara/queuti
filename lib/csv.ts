/**
 * Tiny RFC-4180-ish CSV parser — stdlib only, no dependency.
 * Handles quoted fields, commas and newlines inside quotes, CRLF.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\n") {
      endRow();
    } else if (c === "\r") {
      // skip CR; row ends at LF (handles CRLF)
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) endRow();

  // Trim trailing empty rows (e.g. final newline)
  while (rows.length && rows[rows.length - 1].every((f) => f.trim() === "")) {
    rows.pop();
  }
  return rows;
}

/** Parse a CSV string with a header row into objects, keyed by header names. */
export function parseCsvObjects(
  input: string
): { header: string[]; rows: Record<string, string>[] } {
  const rows = parseCsv(input);
  if (rows.length === 0) return { header: [], rows: [] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const data = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
  return { header, rows: data };
}