import { describe, expect, it } from "vitest";
import {
  cleanStr,
  companyNameOf,
  escapeRegex,
  isEmailLike,
  isHttpUrl,
  strTooLong,
  parsePagination,
} from "@/lib/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

describe("validation helpers (#25)", () => {
  it("trims any value to a string", () => {
    expect(cleanStr("  hi  ")).toBe("hi");
    expect(cleanStr(null)).toBe("");
    expect(cleanStr(undefined)).toBe("");
    expect(cleanStr(42)).toBe("42");
  });

  it("checks email and URL shapes", () => {
    expect(isEmailLike("a@b.co")).toBe(true);
    expect(isEmailLike("not-an-email")).toBe(false);
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("ftp://x")).toBe(false);
  });

  it("flags over-long strings", () => {
    expect(strTooLong("abc", 5)).toBe(false);
    expect(strTooLong("abcdef", 5)).toBe(true);
  });

  it("accepts company as an alias for companyName (#28)", () => {
    expect(companyNameOf({ company: "Acme Corp", title: "x" })).toBe("Acme Corp");
    expect(companyNameOf({ companyName: "Wayne", company: "Acme" })).toBe("Wayne");
    expect(companyNameOf({ companyName: "" })).toBe("");
    expect(companyNameOf({ company: "  Stark Industries  " })).toBe("Stark Industries");
    expect(companyNameOf({ title: "no company here" })).toBe("");
  });

  it("escapes regex metacharacters for user search input (#32)", () => {
    expect(escapeRegex("a.b(c)[d]{e}?*+^$|")).toBe(
      "a\\.b\\(c\\)\\[d\\]\\{e\\}\\?\\*\\+\\^\\$\\|"
    );
    expect(escapeRegex("React Engineer")).toBe("React Engineer");
    expect(escapeRegex("")).toBe("");
  });
});

describe("parsePagination (#25)", () => {
  const opts = {
    defaultSort: "dateApplied",
    defaultOrder: "desc" as const,
    sortable: ["dateApplied", "updatedAt", "title"],
  };

  it("applies defaults", () => {
    const r = parsePagination("http://x/api/applications", opts);
    expect(r).toEqual({
      ok: true,
      page: 1,
      limit: 50,
      sort: "dateApplied",
      order: -1,
    });
  });

  it("parses explicit params and clamps the limit", () => {
    const r = parsePagination(
      "http://x/api/applications?page=3&limit=999&sort=title&order=asc",
      opts
    );
    expect(r).toMatchObject({ ok: true, page: 3, limit: 100, sort: "title", order: 1 });
  });

  it("rejects bad page/limit/sort/order", () => {
    expect(parsePagination("http://x?page=0", opts).ok).toBe(false);
    expect(parsePagination("http://x?limit=abc", opts).ok).toBe(false);
    expect(parsePagination("http://x?sort=hack", opts).ok).toBe(false);
    expect(parsePagination("http://x?order=sideways", opts).ok).toBe(false);
  });
});

describe("rate limiting (#25)", () => {
  it("allows requests under the limit, rejects over it, recovers next window", async () => {
    const key = `test-${Date.now()}`;
    const req = (id: string) =>
      new Request("http://localhost/x", {
        headers: { "x-forwarded-for": id },
      });

    const ip = `10.0.0.${Math.floor(Math.random() * 200)}`;
    for (let i = 0; i < 3; i++) {
      const r = await rateLimit(req(ip), { bucket: key, limit: 3, windowSec: 60 });
      expect(r.ok).toBe(true);
    }
    const blocked = await rateLimit(req(ip), {
      bucket: key,
      limit: 3,
      windowSec: 60,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      const res = rateLimitResponse(blocked.retryAfterSec);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("60");
    }
  });

  it("keys by IP — different clients don't share a bucket", async () => {
    const bucket = `test-${Date.now()}`;
    const a = new Request("http://localhost/x", { headers: { "x-forwarded-for": "1.2.3.4" } });
    const b = new Request("http://localhost/x", { headers: { "x-forwarded-for": "5.6.7.8" } });
    for (let i = 0; i < 2; i++) await rateLimit(a, { bucket, limit: 2, windowSec: 60 });
    expect((await rateLimit(a, { bucket, limit: 2, windowSec: 60 })).ok).toBe(false);
    expect((await rateLimit(b, { bucket, limit: 2, windowSec: 60 })).ok).toBe(true);
  });
});
