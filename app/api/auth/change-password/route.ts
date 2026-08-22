import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import { requireSession, hashPassword, verifyPassword } from "@/lib/auth";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/change-password { currentPassword, newPassword } -> { ok: true }
 *
 * Requires a valid session (cookie or bearer). Re-verifies the CURRENT
 * password before swapping in the new hash so a stolen cookie alone cannot
 * change the password.
 */
export async function POST(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const currentPassword = body.currentPassword || "";
  const newPassword = body.newPassword || "";
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from the current one" },
      { status: 400 }
    );
  }

  const col = await users();
  const user = await col.findOne({ _id: new ObjectId(auth.session.userId) });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  await col.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(newPassword), updatedAt: new Date() } }
  );

  return NextResponse.json({ ok: true });
}