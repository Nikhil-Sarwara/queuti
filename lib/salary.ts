// Salary parsing (#33) — application `salary` fields are free text
// ("120k", "$95,000", "110–140k", "£70k", "negotiable"). This extracts a
// single annualized figure (range → midpoint) and rejects unparseable
// values, so market stats only count what makes sense.

/** Annualized salary estimate from a free-text string, or null. */
export function parseSalary(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).replace(/[,\s]/g, "").toLowerCase();

  const unit = (v: number, u: string) =>
    u === "k" ? v * 1000 : u === "m" ? v * 1_000_000 : v;

  // Range: "110-140k" | "£70k–90k" | "120k-140k" — the suffix binds to
  // the whole range (either side may carry it).
  const range = s.match(
    /(\d+(?:\.\d+)?)\s*([km]?)\s*(?:-|–|—|~|to)\s*(\d+(?:\.\d+)?)\s*([km]?)\b/
  );
  let value: number | null = null;
  if (range) {
    const u = range[2] || range[4]; // suffix from either side
    const lo = unit(parseFloat(range[1]), u);
    const hi = unit(parseFloat(range[3]), u);
    value = (lo + hi) / 2;
  } else {
    // Single figure: "120k" | "$85,000" | "0.5m"
    const single = s.match(/(\d+(?:\.\d+)?)\s*([km]?)\b/);
    if (single) value = unit(parseFloat(single[1]), single[2]);
  }

  // Sanity: plausible annual salaries are 10k – 1.5m.
  if (value === null || !Number.isFinite(value) || value < 10_000 || value > 1_500_000) {
    return null;
  }
  return Math.round(value);
}