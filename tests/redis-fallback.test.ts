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

  it("user cache version starts at 0 and bumps on every write (#29)", async () => {
    const { userCacheVersion, bumpUserCache } = await freshRedis();
    expect(await userCacheVersion("u1")).toBe(0);
    await bumpUserCache("u1");
    await bumpUserCache("u1");
    expect(await userCacheVersion("u1")).toBe(2);
  });

  it("versions are per-user (#29)", async () => {
    const { userCacheVersion, bumpUserCache } = await freshRedis();
    await bumpUserCache("alice");
    await bumpUserCache("alice");
    await bumpUserCache("bob");
    expect(await userCacheVersion("alice")).toBe(2);
    expect(await userCacheVersion("bob")).toBe(1);
  });

  it("a version bump invalidates previously cached list payloads (#29)", async () => {
    const { cacheGet, cacheSet, userCacheVersion, bumpUserCache } =
      await freshRedis();
    const key = (v: number) => `apps:list:u1:${v}:0:1:50:dateApplied:-1`;
    // Simulate: request 1 computes + fills at version 0 (pre-write)…
    await cacheSet(key(0), { n: 1 }, 60);
    expect(await cacheGet(key(0))).toEqual({ n: 1 });
    // …a write bumps the version…
    await bumpUserCache("u1");
    expect(await userCacheVersion("u1")).toBe(1);
    // …so the new page key (v1) misses even though the old page (v0) lingers.
    expect(await cacheGet(key(1))).toBeNull();
  });
});
