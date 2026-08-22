import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { contacts } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cleanStr, isEmailLike, strTooLong, parsePagination } from "@/lib/validate";
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

/** GET /api/contacts — paginated list of the user's contacts. */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const pageInfo = parsePagination(req.url, {
    defaultSort: "name",
    defaultOrder: "asc",
    sortable: ["name", "createdAt", "updatedAt"],
  });
  if (!pageInfo.ok) {
    return NextResponse.json({ error: pageInfo.error }, { status: 400 });
  }
  const { page, limit, sort, order } = pageInfo;

  const col = await contacts();
  const filter = { userId: new ObjectId(session.userId) };
  const [total, docs] = await Promise.all([
    col.countDocuments(filter),
    col
      .find(filter)
      .sort({ [sort]: order, _id: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
  ]);

  return NextResponse.json({
    contacts: docs.map(serialize),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
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

  const str = cleanStr;
  const name = str(body.name);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (strTooLong(name, 200)) {
    return NextResponse.json({ error: "Name must be ≤ 200 characters" }, { status: 400 });
  }

  const email = str(body.email);
  if (email && !isEmailLike(email)) {
    return NextResponse.json({ error: "email must be a valid email" }, { status: 400 });
  }
  const phone = str(body.phone);
  const notes = str(body.notes);
  if (strTooLong(email, 200) || strTooLong(phone, 50) || strTooLong(notes, 10000)) {
    return NextResponse.json(
      { error: "Field too long (email ≤ 200, phone ≤ 50, notes ≤ 10000)" },
      { status: 400 }
    );
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
    email,
    phone,
    companyId,
    notes,
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);

  return NextResponse.json(
    { contact: serialize({ ...doc, _id: res.insertedId }) },
    { status: 201 }
  );
}