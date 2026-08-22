import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications, ensureIndexes, events } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cacheDel } from "@/lib/redis";
import type { Application, ApplicationEvent, ApplicationStatus } from "@/lib/models";

export const dynamic = "force-dynamic";

const STATUSES: ApplicationStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

function toHex(id: unknown): string {
  return id instanceof ObjectId ? id.toHexString() : String(id);
}

function serialize(app: Application) {
  return {
    _id: toHex(app._id),
    title: app.title,
    companyName: app.companyName || "",
    applyUrl: app.applyUrl || "",
    hiringEmail: app.hiringEmail || "",
    source: app.source || "",
    status: app.status,
    dateApplied: app.dateApplied.toISOString(),
    salary: app.salary || "",
    notes: app.notes || "",
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}

function parseBody(body: Record<string, unknown>) {
  const status = (body.status as ApplicationStatus) || "applied";
  if (!STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const dateRaw = (body.dateApplied as string) || new Date().toISOString();
  const dateApplied = new Date(dateRaw);
  if (Number.isNaN(dateApplied.getTime())) {
    throw new Error("Invalid dateApplied");
  }
  const str = (v: unknown) =>
    typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return {
    title: str(body.title),
    companyName: str(body.companyName),
    applyUrl: str(body.applyUrl),
    hiringEmail: str(body.hiringEmail),
    source: str(body.source),
    salary: str(body.salary),
    notes: str(body.notes),
    status,
    dateApplied,
  };
}

/** GET /api/applications — list the signed-in user's applications, newest first. */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const col = await applications();
  const docs = await col
    .find({ userId: new ObjectId(session.userId) })
    .sort({ dateApplied: -1 })
    .toArray();

  return NextResponse.json({ applications: docs.map(serialize) });
}

/** POST /api/applications — create a new application. */
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

  let fields: ReturnType<typeof parseBody>;
  try {
    fields = parseBody(body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid body" },
      { status: 400 }
    );
  }
  if (!fields.title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  const col = await applications();
  const now = new Date();
  const doc: Application = {
    userId: new ObjectId(session.userId),
    ...fields,
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);
  await ensureIndexes().catch(() => {});
  await cacheDel(`analytics:${session.userId}`).catch(() => {});

  // Stage history: the moment of application.
  const evCol = await events();
  const ev: ApplicationEvent = {
    userId: new ObjectId(session.userId),
    applicationId: res.insertedId,
    type: "applied",
    occurredAt: new Date(fields.dateApplied),
    note: "Application submitted",
    createdAt: now,
  };
  await evCol.insertOne(ev).catch(() => {});

  return NextResponse.json(
    { application: serialize({ ...doc, _id: res.insertedId }) },
    { status: 201 }
  );
}