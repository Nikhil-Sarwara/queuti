import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvObjects } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsv('x,"hello, world",y')).toEqual([["x", "hello, world", "y"]]);
  });

  it("handles newlines inside quotes", () => {
    expect(parseCsv('"line1\nline2",z')).toEqual([["line1\nline2", "z"]]);
  });

  it("handles escaped quotes (double-quote)", () => {
    expect(parseCsv('"say ""hi""",x')).toEqual([['say "hi"', "x"]]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops trailing empty rows", () => {
    expect(parseCsv("a,b\n\n\n")).toEqual([["a", "b"]]);
  });
});

describe("parseCsvObjects", () => {
  it("maps headers to objects, lowercased and trimmed", () => {
    const { header, rows } = parseCsvObjects(
      "date,title,company,apply_url\n2026-01-01,Frontend Dev,Acme,https://x"
    );
    expect(header).toEqual(["date", "title", "company", "apply_url"]);
    expect(rows).toEqual([
      {
        date: "2026-01-01",
        title: "Frontend Dev",
        company: "Acme",
        apply_url: "https://x",
      },
    ]);
  });

  it("fills missing trailing cells with empty string", () => {
    const { rows } = parseCsvObjects("a,b\n1");
    expect(rows).toEqual([{ a: "1", b: "" }]);
  });

  it("returns empty when input has no rows", () => {
    expect(parseCsvObjects("")).toEqual({ header: [], rows: [] });
  });
});