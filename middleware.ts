import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionDetailed,
  needsSlidingRefresh,
  signSession,
  sessionCookieOptions,
} from "@/lib/auth";

/**
 * Route protection + sliding sessions + request logging (#40).
 *
 * - /dashboard, /account (and any future app routes) require a valid
 *   queuti_token cookie. Invalid/missing -> redirect to /login. When more
 *   than half the session TTL has elapsed, the token is re-signed (fresh 7d)
 *   and the cookie replaced — active users never hit an expiry mid-session.
 * - Every matched request (incl. /api/*) gets an `x-request-id` header, a
 *   structured one-line JSON log (method, path, status, duration), and edge
 *   errors are reported via ERROR_WEBHOOK_URL (same contract as lib/logging).
 */
export async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const route = `${req.method} ${pathname}`;

  try {
    let res: NextResponse;

    if (isApi) {
      // API routes authenticate themselves via requireSession — pass through.
      res = NextResponse.next();
    } else {
      const token = req.cookies.get("queuti_token")?.value;
      const auth = token ? await verifySessionDetailed(token) : null;

      if (!auth?.session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("next", pathname);
        res = NextResponse.redirect(loginUrl);
      } else {
        if (needsSlidingRefresh(auth.iat, auth.exp)) {
          const fresh = await signSession(auth.session);
          res = NextResponse.next();
          res.cookies.set("queuti_token", fresh, sessionCookieOptions());
        } else {
          res = NextResponse.next();
        }
        // Touch session in background (fire-and-forget via internal API).
        // Cannot import MongoDB modules in Edge runtime, so we POST to an
        // internal endpoint that handles the DB update.
        if (token) {
          const origin = new URL(req.url).origin;
          fetch(`${origin}/api/auth/sessions/touch`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.get("cookie") || "",
            },
            body: JSON.stringify({ token }),
          }).catch(() => {});
        }
      }
    }

    res.headers.set("x-request-id", requestId);
    console.log(
      JSON.stringify({
        level: "info",
        requestId,
        route,
        status: res.status,
        durationMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
      })
    );
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({
        level: "error",
        requestId,
        route,
        message,
        ts: new Date().toISOString(),
      })
    );
    const webhook = process.env.ERROR_WEBHOOK_URL;
    if (webhook) {
      fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, route, message }),
      }).catch(() => {});
    }
    throw err;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/app/:path*", "/account/:path*", "/api/:path*"],
};