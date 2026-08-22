import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { needsSlidingRefresh } from "@/lib/auth";
import {
  generateResetToken,
  hashResetToken,
  resetTokenMatches,
} from "@/lib/reset";

describe("auth password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("hunter2-secret");
    expect(hash).not.toBe("hunter2-secret");
    expect(await verifyPassword("hunter2-secret", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces unique salts for equal passwords", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});

describe("password reset tokens", () => {
  it("generates URL-safe 256-bit tokens", () => {
    const t1 = generateResetToken();
    const t2 = generateResetToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBe(43); // 32 bytes base64url
    expect(/^[A-Za-z0-9_-]+$/.test(t1)).toBe(true);
  });

  it("never stores the raw token — only its hash", () => {
    const token = generateResetToken();
    const hash = hashResetToken(token);
    expect(hash).not.toContain(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("matches the correct token and rejects others", () => {
    const token = generateResetToken();
    const stored = hashResetToken(token);
    expect(resetTokenMatches(token, stored)).toBe(true);
    expect(resetTokenMatches(generateResetToken(), stored)).toBe(false);
    expect(resetTokenMatches("", stored)).toBe(false);
  });
});

describe("sliding session refresh", () => {
  const TTL = 7 * 24 * 60 * 60; // 7d

  it("does not refresh a fresh session", () => {
    const now = 1_700_000_000;
    expect(needsSlidingRefresh(now - 60, now + TTL - 60, now)).toBe(false);
  });

  it("refreshes once more than half the TTL has elapsed", () => {
    const now = 1_700_000_000;
    // issued 4d ago → only 3d left < 3.5d elapsed → refresh
    expect(needsSlidingRefresh(now - 4 * 86400, now + 3 * 86400, now)).toBe(true);
  });

  it("handles missing claims defensively", () => {
    expect(needsSlidingRefresh(undefined, undefined)).toBe(false);
    expect(needsSlidingRefresh(100, undefined)).toBe(false);
  });
});