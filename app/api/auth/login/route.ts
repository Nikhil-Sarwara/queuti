import { NextResponse } from "next/server";
import { users } from "@/lib/models";
import { verifyPassword, signSession, sessionCookieOptions } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** POST /api/auth/login { email, password } -> { token, user } */
export async function POST(req: Request) {
  const limit = await rateLimit(req, { bucket: "auth", limit: 10 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  const col = await users();
  const user = await col.findOne({ email });
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const token = await signSession({
    userId: user._id!.toHexString(),
    email: user.email,
  });

  const res = NextResponse.json({
    token,
    user: { _id: user._id!.toHexString(), email: user.email, name: user.name },
  });
  res.cookies.set("queuti_token", token, sessionCookieOptions());
  return res;
}