import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { users } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { issueVerification } from "../_lib";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify/resend { } — protected; issues a fresh verification
 * token for the signed-in user (the "Resend verification email" button).
 * Always succeeds from the caller's perspective (no account enumeration).
 */
export async function POST(req: Request) {
  const limit = await rateLimit(req, { bucket: "auth", limit: 5 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const col = await users();
  const user = await col.findOne({ _id: new ObjectId(session.userId) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.verified) {
    return NextResponse.json({ ok: true, verified: true });
  }

  const { verifyUrl } = await issueVerification(
    user._id!,
    user.email,
    new URL(req.url).origin
  );
  const payload: Record<string, unknown> = { ok: true };
  if (process.env.NODE_ENV !== "production") payload.devVerifyLink = verifyUrl;
  return NextResponse.json(payload);
}