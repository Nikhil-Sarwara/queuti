import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { hashVerifyToken } from "@/lib/verify";
import { consumeVerification } from "./_lib";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify?token=… — verifies the email address (signed link
 * from the email / dev link). Marks the user verified and clears the token.
 * The route is session-free: the link itself is the credential.
 */
export async function GET(req: Request) {
  const limit = await rateLimit(req, { bucket: "auth", limit: 10 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Find the user by their stored token hash — one lookup, then consume.
  const col = await users();
  const user = await col.findOne({ verifyTokenHash: hashVerifyToken(token) });
  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired verification link" },
      { status: 400 }
    );
  }

  const ok = await consumeVerification(user._id!, token);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid or expired verification link" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, verified: true });
}