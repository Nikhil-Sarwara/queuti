import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import { hashPassword, signSession, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** POST /api/auth/register { email, password, name? } -> { token, user } */
export async function POST(req: Request) {
  const limit = await rateLimit(req, { bucket: "auth", limit: 10 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const col = await users();
  const existing = await col.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const now = new Date();
  const passwordHash = await hashPassword(password);
  const { insertedId } = await col.insertOne({
    email,
    passwordHash,
    name: body.name?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });

  const user = { _id: insertedId, email, name: body.name?.trim() };
  const token = await signSession({
    userId: insertedId.toHexString(),
    email,
  });

  const res = NextResponse.json({ token, user }, { status: 201 });
  res.cookies.set("queuti_token", token, sessionCookieOptions());
  return res;
}