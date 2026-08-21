import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

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