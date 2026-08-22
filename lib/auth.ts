// Auth helpers: bcrypt password hashing + JWT (jose) sign/verify.
// Works in both Node routes and Edge middleware.

// NOTE: this module is imported by middleware (Edge runtime) — keep it free of
// Node-only imports (node:crypto etc.). Node-only helpers live in lib/reset.ts.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { rateLimit, rateLimitResponse } from "./rateLimit";

const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret");

export interface SessionPayload {
  userId: string; // hex ObjectId
  email: string;
}

/** Session lifetime: 7 days, sliding-refreshed in middleware when >half elapsed. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7d

/**
 * CSRF-safe cookie flags for the session cookie: HttpOnly (no JS access),
 * SameSite=Lax (blocks cross-site POSTs), Secure in production, Path=/
 * and an explicit Max-Age. Used everywhere the token cookie is set/cleared.
 */
export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(
  payload: SessionPayload,
  expiresIn: string | number = `${SESSION_TTL_SECONDS}s`
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  const res = await verifySessionDetailed(token);
  return res ? res.session : null;
}

/** Verify + surface iat/exp so callers can implement sliding expiry. */
export async function verifySessionDetailed(
  token: string
): Promise<{ session: SessionPayload; iat?: number; exp?: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.userId || !payload.email) return null;
    return {
      session: {
        userId: payload.userId as string,
        email: payload.email as string,
      },
      iat: payload.iat as number | undefined,
      exp: payload.exp as number | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Sliding session decision: refresh (re-sign) once more than half the TTL has
 * elapsed, so an active user's token never expires while they keep using the app.
 * remaining < elapsed  ⇔  elapsed > TTL/2.
 */
export function needsSlidingRefresh(
  iat: number | undefined,
  exp: number | undefined,
  nowSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!iat || !exp) return false;
  return exp - nowSec < nowSec - iat;
}

/**
 * Extract + verify session from a Request — accepts the queuti_token cookie
 * (same-origin fetches) or a Bearer token (API clients). Rate-limited per IP.
 */
export async function requireSession(
  req: Request
): Promise<{ session: SessionPayload } | { error: Response }> {
  const limit = await rateLimit(req, { bucket: "api" });
  if (!limit.ok) return { error: rateLimitResponse(limit.retryAfterSec) };
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)queuti_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  if (token) {
    const session = await verifySession(token);
    if (session) return { session };
  }
  return requireAuth(req);
}

/**
 * Extract + verify bearer token from a Request. Rate-limited per IP — note
 * requireSession's cookie path already limited this request, and each request
 * passes through exactly one of these branches.
 */
export async function requireAuth(
  req: Request
): Promise<{ session: SessionPayload } | { error: Response }> {
  const limit = await rateLimit(req, { bucket: "api" });
  if (!limit.ok) return { error: rateLimitResponse(limit.retryAfterSec) };
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return {
      error: Response.json(
        { error: "Unauthorized: missing token" },
        { status: 401 }
      ),
    };
  }
  const session = await verifySession(token);
  if (!session) {
    return {
      error: Response.json(
        { error: "Unauthorized: invalid or expired token" },
        { status: 401 }
      ),
    };
  }
  return { session };
}