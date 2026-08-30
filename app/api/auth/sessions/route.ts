import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { listSessions, hashToken } from "@/lib/session";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** GET /api/auth/sessions — list all active sessions for the current user. */
export async function GET(req: Request) {
  const limit = await rateLimit(req, { bucket: "api" });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;

  const { session } = auth;

  // Get current token hash for isCurrent detection
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)queuti_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
  const currentHash = token ? await hashToken(token) : null;

  const sessionsList = await listSessions(session.userId);

  const result = sessionsList.map((s) => ({
    _id: s._id?.toHexString(),
    browser: s.browser || "Unknown",
    os: s.os || "Unknown",
    device: s.device || "unknown",
    ip: s.ip || "Unknown",
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    isCurrent: currentHash ? s.tokenHash === currentHash : false,
  }));

  return NextResponse.json({ sessions: result });
}
