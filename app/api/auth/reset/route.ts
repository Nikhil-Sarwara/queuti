import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import { hashPassword } from "@/lib/auth";
import { resetTokenMatches } from "@/lib/reset";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset { token, password } -> { ok: true }
 *
 * Consumes the one-time reset token (matched against the stored SHA-256 hash,
 * must be unexpired) and sets a new password. Invalid/used/expired tokens get
 * the same 400 so a token cannot be probed.
 */
export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = body.token || "";
  const password = body.password || "";
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (!token) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  const col = await users();
  // Match on the un-hashed token against the stored hash + expiry in one query.
  const candidates = await col
    .find({
      resetTokenHash: { $exists: true },
      resetTokenExpiresAt: { $gt: new Date() },
    })
    .toArray();

  let match = null;
  for (const user of candidates) {
    if (resetTokenMatches(token, user.resetTokenHash!)) {
      match = user;
      break;
    }
  }
  if (!match) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  await col.updateOne(
    { _id: match._id },
    {
      $set: { passwordHash, updatedAt: new Date() },
      $unset: { resetTokenHash: "", resetTokenExpiresAt: "" },
    }
  );

  return NextResponse.json({ ok: true });
}