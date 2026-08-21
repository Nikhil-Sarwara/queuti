import { NextResponse } from "next/server";

/** POST /api/auth/logout — clears the session cookie. */
export async function POST() {
  const res = NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  res.cookies.set("queuti_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}