import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { companies } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cleanStr, isHttpUrl, strTooLong } from "@/lib/validate";
import type { Company } from "@/lib/models";

export const dynamic = "force-dynamic";

const EDITABLE_FIELDS = ["name", "website", "industry", "location", "notes"] as const;

const FIELD_LIMITS: Record<(typeof EDITABLE_FIELDS)[number], number> = {
  name: 200,
  website: 500,
  industry: 100,
  location: 200,
  notes: 10000,
};

const str = cleanStr;

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

/** PATCH /api/companies/[id] — update company fields. */
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
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const $set: Partial<Company> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) {
      const value = str(body[f]);
      if (strTooLong(value, FIELD_LIMITS[f])) {
        return NextResponse.json(
          { error: `${f} must be ≤ ${FIELD_LIMITS[f]} characters` },
          { status: 400 }
        );
      }
      if (f === "website" && value && !isHttpUrl(value)) {
        return NextResponse.json(
          { error: "website must be a valid http(s) URL" },
          { status: 400 }
        );
      }
      $set[f] = value;
    }
  }
  if ($set.name !== undefined && !$set.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  $set.updatedAt = new Date();

  const col = await companies();
  const res = await col.findOneAndUpdate(
    { _id: id, userId: new ObjectId(session.userId) },
    { $set },
    { returnDocument: "after" }
  );
  if (!res) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  return NextResponse.json({ company: serialize(res) });
}

/** DELETE /api/companies/[id] — remove a company (contacts keep their own records). */
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
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const col = await companies();
  const res = await col.deleteOne({ _id: id, userId: new ObjectId(session.userId) });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}