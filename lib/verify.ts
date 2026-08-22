// Email-verification token helpers (Node runtime only — uses node:crypto,
// so this must never be imported from middleware/Edge code).
//
// Same design as password reset (lib/reset.ts): the raw token is only shown
// to the user (via email / dev link); the DB stores a SHA-256 hash so a DB
// leak cannot be replayed to verify accounts.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const VERIFY_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Generate a fresh high-entropy verification token (256 bits, URL-safe). */
export function generateVerifyToken(): string {
  return randomBytes(32).toString("base64url");
}

/** One-way hash of a verification token — what gets stored in the DB. */
export function hashVerifyToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a candidate token hash against the stored one. */
export function verifyTokenMatches(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashVerifyToken(candidate), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}