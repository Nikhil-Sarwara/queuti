import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { companies } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import type { Company } from "@/lib/models";

export const dynamic = "force-dynamic";

function serialize(c: Company) {
  return {
    _id: c._id instanceof ObjectId ? c._id.toHexString() : String(c._id),
    name: c.name,
    website: c.website || "",
    industry: c.industry || "",
    location: c.location || "",
    notes: c.notes || "",
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** GET /api/companies — the signed-in user's companies, A–Z. */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const col = await companies();
  const docs = await col
    .find({ userId: new ObjectId(session.userId) })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json({ companies: docs.map(serialize) });
}

/** POST /api/companies — create a company (name required). */
export async function POST(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const str = (v: unknown) =>
    typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  const name = str(body.name);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const col = await companies();
  const now = new Date();
  const doc: Company = {
    userId: new ObjectId(session.userId),
    name,
    website: str(body.website),
    industry: str(body.industry),
    location: str(body.location),
    notes: str(body.notes),
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);

  return NextResponse.json(
    { company: serialize({ ...doc, _id: res.insertedId }) },
    { status: 201 }
  );
}