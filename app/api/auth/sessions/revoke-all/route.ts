import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { revokeAllSessions, hashToken } from "@/lib/session";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** POST /api/auth/sessions/revoke-all — revoke all sessions except the current one. */
export async function POST(req: Request) {
  const limit = await rateLimit(req, { bucket: "api" });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;

  const { session } = auth;

  // Get current token hash so we preserve this session
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)queuti_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (!token) {
    return NextResponse.json(
      { error: "No active session token found" },
      { status: 400 }
    );
  }

  const currentHash = await hashToken(token);
  const revokedCount = await revokeAllSessions(session.userId, currentHash);

  return NextResponse.json({ ok: true, revokedCount });
}
