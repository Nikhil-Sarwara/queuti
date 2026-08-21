import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

/**
 * Route protection: /dashboard (and any future app routes) require a valid
 * queuti_token cookie. Invalid/missing -> redirect to /login.
 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("queuti_token")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/app/:path*"],
};