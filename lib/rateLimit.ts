// Sliding fixed-window HTTP rate limiter (#25).
//
// Primary backend: Upstash Redis (REST client — works on both Node and Edge).
// Fallback: per-process in-memory map (dev/local, resets on restart).
// Edge-safe: no Node-only imports.

import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

let client: Redis | null = null;
function getRedis(): Redis | null {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  if (!client) client = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  return client;
}

// ---- in-memory fallback ----
const mem = new Map<string, { count: number; resetAt: number }>();

function memLimit(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || entry.resetAt <= now) {
    mem.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  entry.count += 1;
  // Opportunistic sweep — keeps the map bounded under burst traffic.
  if (mem.size > 5000) {
    const now2 = Date.now();
    mem.forEach((v, k) => {
      if (v.resetAt <= now2) mem.delete(k);
    });
  }
  return entry.count <= limit;
}

async function redisLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const r = getRedis();
  if (!r) return memLimit(key, limit, windowSec);
  const window = Math.floor(Date.now() / 1000 / windowSec);
  const fullKey = `rl:${key}:${window}`;
  try {
    const count = await r.incr(fullKey);
    if (count === 1) await r.expire(fullKey, windowSec);
    return count <= limit;
  } catch {
    // Redis hiccup → fail open (availability over strictness).
    return true;
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Fixed-window rate limit keyed by bucket + client IP.
 * - bucket "api": general authenticated API traffic (default 120 req/min)
 * - bucket "auth": login/register/forgot/reset (default 10 req/min)
 */
export async function rateLimit(
  req: Request,
  opts: { bucket: string; limit?: number; windowSec?: number } = { bucket: "api" }
): Promise<RateLimitResult> {
  const limit = opts.limit ?? 120;
  const windowSec = opts.windowSec ?? 60;
  const key = `${opts.bucket}:${clientIp(req)}`;
  const allowed = await redisLimit(key, limit, windowSec);
  if (allowed) return { ok: true };
  return { ok: false, retryAfterSec: windowSec };
}

/** Convenience: build the 429 Response for a rejected request. */
export function rateLimitResponse(retryAfterSec: number): Response {
  return Response.json(
    { error: "Too many requests — slow down and try again shortly" },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}