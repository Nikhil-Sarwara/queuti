// Auth helpers: bcrypt password hashing + JWT (jose) sign/verify.
// Works in both Node routes and Edge middleware.

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret");

export interface SessionPayload {
  userId: string; // hex ObjectId
  email: string;
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

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.userId || !payload.email) return null;
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/**
 * Extract + verify session from a Request — accepts the queuti_token cookie
 * (same-origin fetches) or a Bearer token (API clients).
 */
export async function requireSession(
  req: Request
): Promise<{ session: SessionPayload } | { error: Response }> {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)queuti_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  if (token) {
    const session = await verifySession(token);
    if (session) return { session };
  }
  return requireAuth(req);
}

/** Extract + verify bearer token from a Request. */
export async function requireAuth(
  req: Request
): Promise<{ session: SessionPayload } | { error: Response }> {
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