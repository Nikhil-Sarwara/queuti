import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { contacts } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import type { Contact } from "@/lib/models";

export const dynamic = "force-dynamic";

function serialize(c: Contact) {
  return {
    _id: c._id instanceof ObjectId ? c._id.toHexString() : String(c._id),
    name: c.name,
    email: c.email || "",
    phone: c.phone || "",
    companyId: c.companyId instanceof ObjectId ? c.companyId.toHexString() : c.companyId || "",
    notes: c.notes || "",
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** GET /api/contacts — the signed-in user's contacts, A–Z. */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const col = await contacts();
  const docs = await col
    .find({ userId: new ObjectId(session.userId) })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json({ contacts: docs.map(serialize) });
}

/** POST /api/contacts — create a contact (name required; optional companyId). */
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

  let companyId: ObjectId | undefined;
  const rawCompany = str(body.companyId);
  if (rawCompany) {
    try {
      companyId = new ObjectId(rawCompany);
    } catch {
      return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
    }
  }

  const col = await contacts();
  const now = new Date();
  const doc: Contact = {
    userId: new ObjectId(session.userId),
    name,
    email: str(body.email),
    phone: str(body.phone),
    companyId,
    notes: str(body.notes),
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);

  return NextResponse.json(
    { contact: serialize({ ...doc, _id: res.insertedId }) },
    { status: 201 }
  );
}