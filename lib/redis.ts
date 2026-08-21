import { Redis } from "@upstash/redis";

/**
 * Upstash Redis layer (#8) — healthcheck, JSON cache, FIFO queue.
 * Uses the REST client (serverless-friendly, TLS over HTTPS), so it works
 * identically on Vercel and local dev. Wired from env UPSTASH_REDIS_URL +
 * UPSTASH_REDIS_TOKEN (never committed).
 *
 * NOTE: On Upstash the REST URL is `https://<endpoint>` and the token is the
 * password part of the redis:// URI. The client falls back to a graceful
 * no-op (memory cache + in-process queue) when env vars are absent so the
 * app still boots locally without Redis.
 */

const ceil = Math.ceil;

const REDIS_URL = process.env.UPSTASH_REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

export function redisEnabled(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

let client: Redis | null = null;
let memoryFallback = false;

function getRedis(): Redis | null {
  if (!redisEnabled()) {
    memoryFallback = true;
    return null;
  }
  if (!client) {
    client = new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
  }
  return client;
}

// ---- in-memory fallback (dev only, non-persistent) ----
const memStore = new Map<string, { v: unknown; exp: number }>();
const memQueue = new Map<string, unknown[]>();

export async function redisPing(): Promise<{ ok: boolean; latencyMs?: number; note?: string }> {
  const r = getRedis();
  if (!r) {
    return { ok: false, note: "UPSTASH_REDIS_URL/TOKEN not set — using in-memory fallback" };
  }
  const t0 = Date.now();
  try {
    await r.ping();
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    console.error("[queuti] redis ping failed:", err);
    return { ok: false, note: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Get a JSON value from cache. Returns null on miss/error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) {
    const hit = memStore.get(key);
    if (hit && hit.exp > Date.now()) return hit.v as T;
    memStore.delete(key);
    return null;
  }
  try {
    return await r.get<T>(key);
  } catch (err) {
    console.error("[queuti] cache get failed:", key, err);
    return null;
  }
}

/**
 * Set a JSON value with TTL (seconds). No-op on error.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return;
  const r = getRedis();
  if (!r) {
    memStore.set(key, { v: value, exp: Date.now() + ttlSeconds * 1000 });
    return;
  }
  try {
    await r.set(key, JSON.stringify(value), { ex: ceil(ttlSeconds) });
  } catch (err) {
    console.error("[queuti] cache set failed:", key, err);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) {
    memStore.delete(key);
    return;
  }
  try {
    await r.del(key);
  } catch (err) {
    console.error("[queuti] cache del failed:", key, err);
  }
}

/** Cache-aside helper: read cache, else compute + fill, with TTL. */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Push an item onto a FIFO queue (LPUSH + RPOP). */
export async function queuePush<T>(queue: string, item: T): Promise<boolean> {
  const r = getRedis();
  if (!r) {
    const q = memQueue.get(queue) ?? [];
    q.push(item);
    memQueue.set(queue, q);
    return true;
  }
  try {
    await r.lpush(queue, JSON.stringify(item));
    return true;
  } catch (err) {
    console.error("[queuti] queue push failed:", queue, err);
    return false;
  }
}

/** Pop the oldest item off a FIFO queue, or null when empty. */
export async function queuePop<T>(queue: string): Promise<T | null> {
  const r = getRedis();
  if (!r) {
    const q = memQueue.get(queue) ?? [];
    const item = q.shift();
    if (item === undefined) return null;
    return item as T;
  }
  try {
    const raw = await r.rpop<string>(queue);
    if (raw === null || raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch (err) {
    console.error("[queuti] queue pop failed:", queue, err);
    return null;
  }
}

/** Queue length (0 on empty/error). */
export async function queueLen(queue: string): Promise<number> {
  const r = getRedis();
  if (!r) return (memQueue.get(queue) ?? []).length;
  try {
    return await r.llen(queue);
  } catch (err) {
    console.error("[queuti] queue len failed:", queue, err);
    return 0;
  }
}