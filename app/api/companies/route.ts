import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { companies } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cleanStr, isHttpUrl, strTooLong, parsePagination } from "@/lib/validate";
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

/** GET /api/companies — paginated list of the user's companies. */
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

  const col = await companies();
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
    companies: docs.map(serialize),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
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

  const str = cleanStr;
  const name = str(body.name);
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (strTooLong(name, 200)) {
    return NextResponse.json({ error: "Name must be ≤ 200 characters" }, { status: 400 });
  }

  const website = str(body.website);
  if (website && !isHttpUrl(website)) {
    return NextResponse.json(
      { error: "website must be a valid http(s) URL" },
      { status: 400 }
    );
  }
  const industry = str(body.industry);
  const location = str(body.location);
  const notes = str(body.notes);
  if (
    strTooLong(website, 500) ||
    strTooLong(industry, 100) ||
    strTooLong(location, 200) ||
    strTooLong(notes, 10000)
  ) {
    return NextResponse.json(
      { error: "Field too long (website ≤ 500, industry ≤ 100, location ≤ 200, notes ≤ 10000)" },
      { status: 400 }
    );
  }

  const col = await companies();
  const now = new Date();
  const doc: Company = {
    userId: new ObjectId(session.userId),
    name,
    website,
    industry,
    location,
    notes,
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);

  return NextResponse.json(
    { company: serialize({ ...doc, _id: res.insertedId }) },
    { status: 201 }
  );
}