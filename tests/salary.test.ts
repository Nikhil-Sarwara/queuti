import { describe, expect, it } from "vitest";
import { parseSalary } from "@/lib/salary";

describe("salary parsing (#33)", () => {
  it("parses k-suffix figures", () => {
    expect(parseSalary("120k")).toBe(120_000);
    expect(parseSalary("120K")).toBe(120_000);
    expect(parseSalary("95k")).toBe(95_000);
  });

  it("parses dollar/cents formats", () => {
    expect(parseSalary("$120,000")).toBe(120_000);
    expect(parseSalary("$85,000/yr")).toBe(85_000);
  });

  it("uses the midpoint of a range", () => {
    expect(parseSalary("110-140k")).toBe(125_000);
    expect(parseSalary("£70k–90k")).toBe(80_000);
  });

  it("parses m-suffix", () => {
    expect(parseSalary("0.5m")).toBe(500_000);
  });

  it("rejects unparseable and implausible values", () => {
    expect(parseSalary("negotiable")).toBeNull();
    expect(parseSalary("")).toBeNull();
    expect(parseSalary(null)).toBeNull();
    expect(parseSalary("$5")).toBeNull(); // too small
    expect(parseSalary("2000000")).toBeNull(); // too large
  });
});