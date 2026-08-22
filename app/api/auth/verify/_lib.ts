import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import {
  VERIFY_TOKEN_TTL_MS,
  generateVerifyToken,
  hashVerifyToken,
  verifyTokenMatches,
} from "@/lib/verify";
import { sendVerificationEmail } from "@/lib/mailer";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * Issue a fresh email-verification token for a user (register + resend).
 * Shared helper so both flows behave identically. Returns the verify URL;
 * in non-production builds the API echoes it back as `devVerifyLink` so the
 * round-trip works without SMTP.
 */
export async function issueVerification(
  userId: ObjectId,
  email: string,
  origin: string
): Promise<{ verifyUrl: string }> {
  const token = generateVerifyToken();
  const now = new Date();
  const col = await users();
  await col.updateOne(
    { _id: userId },
    {
      $set: {
        verifyTokenHash: hashVerifyToken(token),
        verifyTokenExpiresAt: new Date(now.getTime() + VERIFY_TOKEN_TTL_MS),
        updatedAt: now,
      },
    }
  );

  const verifyUrl = `${origin}/verify?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail(email, verifyUrl);
  return { verifyUrl };
}

/** True when a valid, unexpired verification token matches the stored hash. */
export async function consumeVerification(
  userId: ObjectId,
  candidateToken: string
): Promise<boolean> {
  const col = await users();
  const user = await col.findOne({ _id: userId });
  if (!user || !user.verifyTokenHash || !user.verifyTokenExpiresAt) return false;
  if (new Date(user.verifyTokenExpiresAt).getTime() < Date.now()) return false;
  if (!verifyTokenMatches(candidateToken, user.verifyTokenHash)) return false;

  await col.updateOne(
    { _id: userId },
    {
      $set: { verified: true, updatedAt: new Date() },
      $unset: { verifyTokenHash: "", verifyTokenExpiresAt: "" },
    }
  );
  return true;
}