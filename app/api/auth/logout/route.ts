import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";

/** POST /api/auth/logout — clears the session cookie (same flags it was set with). */
export async function POST() {
  const res = NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  res.cookies.set("queuti_token", "", sessionCookieOptions(0));
  return res;
}