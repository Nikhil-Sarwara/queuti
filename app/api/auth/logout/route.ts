import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";

/** POST /api/auth/logout — clears the session cookie (same flags it was set with). */
export async function POST(req: Request) {
  // Redirect same-origin (based on the request's own origin, not a hardcoded
  // env var) so logout works identically in dev and production.
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(new URL("/login", origin));
  res.cookies.set("queuti_token", "", sessionCookieOptions(0));
  return res;
}
