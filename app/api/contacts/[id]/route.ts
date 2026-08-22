import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { contacts } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import type { Contact } from "@/lib/models";

export const dynamic = "force-dynamic";

const EDITABLE_FIELDS = ["name", "email", "phone", "notes"] as const;

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

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

/** PATCH /api/contacts/[id] — update contact fields (incl. company link). */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  let id: ObjectId;
  try {
    id = new ObjectId(params.id);
  } catch {
    return NextResponse.json({ error: "Invalid contact id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const $set: Partial<Contact> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) $set[f] = str(body[f]);
  }
  if ($set.name !== undefined && !$set.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (body.companyId !== undefined) {
    const raw = str(body.companyId);
    if (raw) {
      try {
        $set.companyId = new ObjectId(raw);
      } catch {
        return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
      }
    } else {
      $set.companyId = undefined;
    }
  }
  $set.updatedAt = new Date();

  const col = await contacts();
  const res = await col.findOneAndUpdate(
    { _id: id, userId: new ObjectId(session.userId) },
    { $set },
    { returnDocument: "after" }
  );
  if (!res) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ contact: serialize(res) });
}

/** DELETE /api/contacts/[id] — remove a contact. */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  let id: ObjectId;
  try {
    id = new ObjectId(params.id);
  } catch {
    return NextResponse.json({ error: "Invalid contact id" }, { status: 400 });
  }

  const col = await contacts();
  const res = await col.deleteOne({ _id: id, userId: new ObjectId(session.userId) });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}