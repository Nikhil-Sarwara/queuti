import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — protected; returns the current user.
 * Accepts the queuti_token httpOnly cookie (browser/Same-Origin fetches)
 * or a Bearer token (API clients) — same policy as every other API route.
 */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;

  const { session } = auth;
  const col = await users();
  const user = await col.findOne(
    { _id: new ObjectId(session.userId) },
    { projection: { passwordHash: 0 } }
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
