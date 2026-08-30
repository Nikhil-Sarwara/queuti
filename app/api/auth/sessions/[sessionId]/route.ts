import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { revokeSession, hashToken } from "@/lib/session";
import { sessions } from "@/lib/models";
import { ObjectId } from "mongodb";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** DELETE /api/auth/sessions/[sessionId] — revoke a specific session. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const limit = await rateLimit(req, { bucket: "api" });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;

  const { session } = auth;
  const { sessionId } = await params;

  // Check if trying to revoke the current session
  const cookie = req.headers.get("cookie") || "";
  const cookieMatch = cookie.match(/(?:^|;\s*)queuti_token=([^;]+)/);
  const token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  if (token) {
    const currentHash = await hashToken(token);
    const col = await sessions();
    const targetSession = await col.findOne({
      _id: new ObjectId(sessionId),
      userId: new ObjectId(session.userId),
    });

    if (targetSession && targetSession.tokenHash === currentHash) {
      return NextResponse.json(
        { error: "Cannot revoke current session — use logout instead" },
        { status: 400 }
      );
    }
  }

  const revoked = await revokeSession(session.userId, sessionId);
  if (!revoked) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
