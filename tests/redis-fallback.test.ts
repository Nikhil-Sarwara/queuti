import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// These tests exercise the in-memory fallback path: no UPSTASH_REDIS_URL /
// UPSTASH_REDIS_TOKEN, so the layer must degrade gracefully without a
// network connection (dev machines, CI). lib/redis singleton-izes its
// client, so each test re-imports the module fresh.

async function freshRedis() {
  return import("@/lib/redis");
}

describe("redis fallback (no env)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_TOKEN;
    vi.resetModules();
  });
  afterEach(() => {
    vi.resetModules();
  });

  it("cacheGet returns null on miss", async () => {
    const { cacheGet } = await freshRedis();
    expect(await cacheGet("nope")).toBeNull();
  });

  it("cache set/get round-trips values", async () => {
    const { cacheSet, cacheGet } = await freshRedis();
    await cacheSet("k", { a: 1 }, 60);
    expect(await cacheGet("k")).toEqual({ a: 1 });
  });

  it("cache expires after TTL", async () => {
    const { cacheSet, cacheGet } = await freshRedis();
    await cacheSet("short", "v", 1);
    expect(await cacheGet("short")).toBe("v");
    await new Promise((r) => setTimeout(r, 1100));
    expect(await cacheGet("short")).toBeNull();
  });

  it("cacheDel removes a key", async () => {
    const { cacheSet, cacheDel, cacheGet } = await freshRedis();
    await cacheSet("gone", 1, 60);
    await cacheDel("gone");
    expect(await cacheGet("gone")).toBeNull();
  });

  it("withCache computes once and serves the hit", async () => {
    const { withCache } = await freshRedis();
    const compute = vi.fn(async () => ({ n: 42 }));
    expect(await withCache("wc", 60, compute)).toEqual({ n: 42 });
    expect(await withCache("wc", 60, compute)).toEqual({ n: 42 });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("queue is FIFO", async () => {
    const { queuePush, queuePop, queueLen } = await freshRedis();
    await queuePush("q", 1);
    await queuePush("q", 2);
    await queuePush("q", 3);
    expect(await queueLen("q")).toBe(3);
    expect(await queuePop("q")).toBe(1);
    expect(await queuePop("q")).toBe(2);
    expect(await queuePop("q")).toBe(3);
    expect(await queuePop("q")).toBeNull();
    expect(await queueLen("q")).toBe(0);
  });
});