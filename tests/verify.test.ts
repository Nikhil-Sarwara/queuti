import { describe, expect, it } from "vitest";
import {
  VERIFY_TOKEN_TTL_MS,
  generateVerifyToken,
  hashVerifyToken,
  verifyTokenMatches,
} from "@/lib/verify";

describe("email verification tokens (#38)", () => {
  it("generates distinct high-entropy tokens", () => {
    const a = generateVerifyToken();
    const b = generateVerifyToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40); // 32 random bytes, base64url
  });

  it("hashes one-way — the raw token is never stored", () => {
    const token = generateVerifyToken();
    const stored = hashVerifyToken(token);
    expect(stored).not.toContain(token);
    expect(stored).toMatch(/^[0-9a-f]{64}$/); // sha-256 hex
  });

  it("matches the same token, rejects others (constant-time path)", () => {
    const token = generateVerifyToken();
    const stored = hashVerifyToken(token);
    expect(verifyTokenMatches(token, stored)).toBe(true);
    expect(verifyTokenMatches(generateVerifyToken(), stored)).toBe(false);
    expect(verifyTokenMatches("", stored)).toBe(false);
    expect(verifyTokenMatches(token, hashVerifyToken("other"))).toBe(false);
  });

  it("the same token hashes deterministically", () => {
    const token = "fixed-test-token";
    expect(hashVerifyToken(token)).toBe(hashVerifyToken(token));
  });

  it("TTL is a week (links stay usable, but not forever)", () => {
    expect(VERIFY_TOKEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});