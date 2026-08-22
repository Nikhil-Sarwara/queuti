// Small input-validation + pagination helpers shared by API routes (#25).

export type PaginationResult =
  | {
      ok: true;
      page: number;
      limit: number;
      sort: string;
      order: 1 | -1;
    }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;

/** Trim any value to a string (null/undefined → ""). */
export function cleanStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

export function strTooLong(s: string, max: number): boolean {
  return s.length > max;
}

export function isEmailLike(s: string): boolean {
  return EMAIL_RE.test(s);
}

export function isHttpUrl(s: string): boolean {
  return HTTP_URL_RE.test(s);
}

/**
 * Parse + clamp ?page / ?limit / ?sort / ?order query params.
 * - page: int ≥ 1 (default 1)
 * - limit: int 1..maxLimit (default 50)
 * - sort: must be in the endpoint's whitelist (default provided)
 * - order: asc|desc (default per endpoint)
 */
export function parsePagination(
  url: string | URL,
  opts: {
    defaultSort: string;
    defaultOrder?: "asc" | "desc";
    sortable: readonly string[];
    maxLimit?: number;
  }
): PaginationResult {
  const u = typeof url === "string" ? new URL(url) : url;
  const maxLimit = opts.maxLimit ?? 100;

  const rawPage = u.searchParams.get("page") ?? "1";
  const page = Number.parseInt(rawPage, 10);
  if (!Number.isInteger(page) || page < 1) {
    return { ok: false, error: "page must be a positive integer" };
  }

  const rawLimit = u.searchParams.get("limit") ?? "50";
  const limit = Number.parseInt(rawLimit, 10);
  if (!Number.isInteger(limit) || limit < 1) {
    return { ok: false, error: "limit must be a positive integer" };
  }
  const clamped = Math.min(limit, maxLimit);

  const sort = u.searchParams.get("sort") ?? opts.defaultSort;
  if (!opts.sortable.includes(sort)) {
    return {
      ok: false,
      error: `sort must be one of: ${opts.sortable.join(", ")}`,
    };
  }

  const rawOrder = u.searchParams.get("order") ?? opts.defaultOrder ?? "desc";
  if (rawOrder !== "asc" && rawOrder !== "desc") {
    return { ok: false, error: "order must be 'asc' or 'desc'" };
  }

  return { ok: true, page, limit: clamped, sort, order: rawOrder === "asc" ? 1 : -1 };
}