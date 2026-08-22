import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

// Cache-behavior tests for the Redis-aside layer (#29/#37), exercising the
// in-memory fallback: compute-once semantics, per-user versioning, and
// invalidation ordering. Re-import the module fresh per test (the client is
// a module-level singleton).

async function freshRedis() {
  return import("@/lib/redis");
}

describe("cache behavior (#29/#37)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_TOKEN;
    vi.resetModules();
  });
  afterEach(() => {
    vi.resetModules();
  });

  it("withCache computes exactly once and reuses the hit", async () => {
    const { withCache } = await freshRedis();
    let calls = 0;
    const compute = async () => {
      calls++;
      return { n: calls };
    };
    const a = await withCache("k1", 60, compute);
    const b = await withCache("k1", 60, compute);
    expect(a).toEqual({ n: 1 });
    expect(b).toEqual({ n: 1 });
    expect(calls).toBe(1);
  });

  it("withCache recomputes after the TTL expires", async () => {
    const { withCache } = await freshRedis();
    let calls = 0;
    const compute = async () => ({ n: ++calls });
    await withCache("k2", 1, compute);
    expect(await withCache("k2", 1, compute)).toEqual({ n: 1 });
    await new Promise((r) => setTimeout(r, 1100));
    expect(await withCache("k2", 1, compute)).toEqual({ n: 2 });
  });

  it("bumpUserCache is per-user — other users' caches survive (#29)", async () => {
    const { cacheSet, cacheGet, bumpUserCache } = await freshRedis();
    const key = (u: string, v: number) => `apps:list:${u}:${v}`;
    await cacheSet(key("alice", 0), { n: 1 }, 60);
    await cacheSet(key("bob", 0), { n: 2 }, 60);
    await bumpUserCache("alice");
    expect(await cacheGet(key("alice", 0))).toEqual({ n: 1 }); // old key remains…
    expect(await cacheGet(key("alice", 1))).toBeNull(); // …but new page key misses
    expect(await cacheGet(key("bob", 0))).toEqual({ n: 2 }); // bob untouched
  });

  it("first write bumps 0 → 1 so even a pre-write cache is invalidated", async () => {
    const { withCache, cacheSet, cacheGet, userCacheVersion, bumpUserCache } =
      await freshRedis();
    // Pre-write: a cached page stored under version 0.
    await cacheSet("apps:list:u:0", { n: 99 }, 60);
    await bumpUserCache("u");
    expect(await userCacheVersion("u")).toBe(1);
    expect(await cacheGet("apps:list:u:1")).toBeNull();
    // withCache on the versioned page computes fresh (not the stale v0 value)
    const v = await userCacheVersion("u");
    const got = await withCache(`apps:list:u:${v}`, 60, async () => ({ n: 42 }));
    expect(got).toEqual({ n: 42 });
    expect(await cacheGet("apps:list:u:0")).toEqual({ n: 99 }); // stale lingers harmlessly
  });

  it("queue is FIFO and length tracks it", async () => {
    const { queuePush, queuePop, queueLen } = await freshRedis();
    expect(await queueLen("q")).toBe(0);
    await queuePush("q", "a");
    await queuePush("q", "b");
    expect(await queueLen("q")).toBe(2);
    expect(await queuePop("q")).toBe("a");
    expect(await queuePop("q")).toBe("b");
    expect(await queuePop("q")).toBeNull();
    expect(await queueLen("q")).toBe(0);
  });

  it("cache values are independent per key (no cross-talk)", async () => {
    const { cacheSet, cacheGet } = await freshRedis();
    await cacheSet("x", { a: 1 }, 60);
    await cacheSet("y", { b: 2 }, 60);
    expect(await cacheGet("x")).toEqual({ a: 1 });
    expect(await cacheGet("y")).toEqual({ b: 2 });
    await cacheSet("x", { a: 3 }, 60);
    expect(await cacheGet("x")).toEqual({ a: 3 });
    expect(await cacheGet("y")).toEqual({ b: 2 });
  });
});