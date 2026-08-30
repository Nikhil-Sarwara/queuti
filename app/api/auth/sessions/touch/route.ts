import { NextResponse } from "next/server";
import { hashToken, touchSession } from "@/lib/session";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/sessions/touch — background endpoint called from middleware
 * to update lastActiveAt. Accepts { token } in body, hashes it, and touches
 * the matching session record. Fire-and-forget; no auth required beyond the
 * token itself (the middleware already verified it before calling this).
 */
export async function POST(req: Request) {
  // Very generous rate limit — this is called on every page load
  const limit = await rateLimit(req, { bucket: "api", limit: 300 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (!body.token) return NextResponse.json({ ok: true });

  const tokenHash = await hashToken(body.token);
  await touchSession(tokenHash).catch(() => {});

  return NextResponse.json({ ok: true });
}
