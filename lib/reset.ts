// Password-reset token helpers (Node runtime only — uses node:crypto, so this
// must never be imported from middleware/Edge code).
//
// The raw token is only ever shown to the user (via email / dev link); the DB
// stores a SHA-256 hash so a DB leak cannot be replayed to reset accounts.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Generate a fresh high-entropy reset token (256 bits, URL-safe). */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** One-way hash of a reset token — what gets stored in the DB. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a candidate token hash against the stored one. */
export function resetTokenMatches(candidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashResetToken(candidate), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}