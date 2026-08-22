import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionDetailed,
  needsSlidingRefresh,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";

/**
 * Route protection + sliding sessions: /dashboard, /account (and any future
 * app routes) require a valid queuti_token cookie. Invalid/missing -> redirect
 * to /login. When more than half the session TTL has elapsed, the token is
 * re-signed (fresh 7d) and the cookie replaced — active users never hit an
 * expiry mid-session.
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("queuti_token")?.value;
  const auth = token ? await verifySessionDetailed(token) : null;

  if (!auth?.session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (needsSlidingRefresh(auth.iat, auth.exp)) {
    const fresh = await signSession(auth.session);
    const res = NextResponse.next();
    res.cookies.set("queuti_token", fresh, sessionCookieOptions());
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/app/:path*", "/account/:path*"],
};