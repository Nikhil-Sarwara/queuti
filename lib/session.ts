/**
 * Session management helpers — create, touch, list, revoke login sessions.
 * Uses SHA-256 via Web Crypto API (Edge-compatible) to hash tokens.
 */

import { ObjectId } from "mongodb";
import { type Session, sessions } from "./models";
import { SESSION_TTL_SECONDS } from "./auth";
import { parseUserAgent } from "./ua";
import { clientIp } from "./rateLimit";

/** Hash a JWT token with SHA-256 for safe storage. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Extract the queuti_token cookie from a raw Cookie header. */
function extractToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)queuti_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Create a new session record on login. */
export async function createSession(
  userId: string,
  token: string,
  req: Request
): Promise<Session> {
  const tokenHash = await hashToken(token);
  const ua = req.headers.get("user-agent") || null;
  const ip = clientIp(req);
  const parsed = parseUserAgent(ua);
  const now = new Date();

  const doc: Session = {
    userId: new ObjectId(userId),
    tokenHash,
    userAgent: ua || undefined,
    ip,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    lastActiveAt: now,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
  };

  const col = await sessions();
  await col.insertOne(doc);
  return doc;
}

/** Update lastActiveAt for a session (fire-and-forget from middleware). */
export async function touchSession(tokenHash: string): Promise<void> {
  const col = await sessions();
  await col.updateOne(
    { tokenHash },
    { $set: { lastActiveAt: new Date() } }
  );
}

/** List all active (non-expired) sessions for a user, newest first. */
export async function listSessions(userId: string): Promise<Session[]> {
  const col = await sessions();
  return col
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
}

/** Revoke a specific session by ID. Only succeeds if it belongs to the user. */
export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const col = await sessions();
  const result = await col.deleteOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(userId),
  });
  return result.deletedCount > 1 ? true : result.deletedCount === 1;
}

/**
 * Revoke all sessions for a user EXCEPT the one matching the given tokenHash.
 * Returns the number of sessions revoked.
 */
export async function revokeAllSessions(
  userId: string,
  exceptTokenHash: string
): Promise<number> {
  const col = await sessions();
  const result = await col.deleteMany({
    userId: new ObjectId(userId),
    tokenHash: { $ne: exceptTokenHash },
  });
  return result.deletedCount;
}

/** Delete a single session by tokenHash (used on logout). */
export async function deleteSession(tokenHash: string): Promise<void> {
  const col = await sessions();
  await col.deleteOne({ tokenHash });
}

/** Cleanup expired sessions — safety net alongside MongoDB TTL index. */
export async function cleanupExpiredSessions(): Promise<void> {
  const col = await sessions();
  const result = await col.deleteMany({ expiresAt: { $lte: new Date() } });
  if (result.deletedCount > 0) {
    console.log(
      `Session cleanup: removed ${result.deletedCount} expired sessions`
    );
  }
}
