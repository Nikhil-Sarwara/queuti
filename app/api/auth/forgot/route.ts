import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_MS,
} from "@/lib/reset";
import { sendResetEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot { email } -> { ok: true }
 *
 * Enumerating accounts is not possible: the response is identical whether or
 * not the email exists. When a user exists a one-time reset token is stored
 * (hashed, 1h expiry) and emailed. In non-production builds the link is also
 * echoed back as `devResetLink` so the flow can be tested end-to-end locally.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const col = await users();
  const user = await col.findOne({ email });
  if (!user) {
    // Behave identically to the success path — no account enumeration.
    return NextResponse.json({ ok: true });
  }

  const token = generateResetToken();
  const now = new Date();
  await col.updateOne(
    { _id: user._id },
    {
      $set: {
        resetTokenHash: hashResetToken(token),
        resetTokenExpiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
        updatedAt: now,
      },
    }
  );

  const origin = new URL(req.url).origin;
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  await sendResetEmail(user.email, resetUrl);

  const payload: Record<string, unknown> = { ok: true };
  // Echo the link in dev/staging so the round-trip is verifiable without SMTP.
  if (process.env.NODE_ENV !== "production") {
    payload.devResetLink = resetUrl;
  }
  return NextResponse.json(payload);
}