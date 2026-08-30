import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";
import { deleteSession, hashToken } from "@/lib/session";

/** POST /api/auth/logout — clears the session cookie and deletes the session record. */
export async function POST(req: Request) {
  // Find and delete the session record for the current token
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)queuti_token=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    const tokenHash = await hashToken(token);
    await deleteSession(tokenHash);
  }

  // Redirect same-origin (based on the request's own origin, not a hardcoded
  // env var) so logout works identically in dev and production.
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(new URL("/login", origin));
  res.cookies.set("queuti_token", "", sessionCookieOptions(0));
  return res;
}
