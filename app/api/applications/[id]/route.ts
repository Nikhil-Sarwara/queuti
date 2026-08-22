import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications, events } from "@/lib/models";
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

const EDITABLE_FIELDS = [
  "title",
  "companyName",
  "applyUrl",
  "hiringEmail",
  "source",
  "salary",
  "notes",
] as const;

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

/** GET /api/applications/[id] — fetch one application (detail page). */
export async function GET(
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
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const col = await applications();
  const doc = await col.findOne({ _id: id, userId: new ObjectId(session.userId) });
  if (!doc) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json({ application: serialize(doc) });
}

/** PATCH /api/applications/[id] — update fields and/or move status. */
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
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const col = await applications();
  const existing = await col.findOne({ _id: id, userId: new ObjectId(session.userId) });
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const $set: Partial<Application> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) $set[f] = str(body[f]);
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as ApplicationStatus)) {
      return NextResponse.json(
        { error: `Invalid status: ${body.status}` },
        { status: 400 }
      );
    }
    const next = body.status as ApplicationStatus;
    $set.status = next;
    // First response = first move off "applied" that isn't a ghosting.
    if (
      existing.status === "applied" &&
      next !== "applied" &&
      next !== "ghosted" &&
      !existing.respondedAt
    ) {
      $set.respondedAt = new Date();
    }
    // Stage history: record the move.
    if (next !== existing.status) {
      const now = new Date();
      const evCol = await events();
      const ev: ApplicationEvent = {
        userId: new ObjectId(session.userId),
        applicationId: id,
        type: next,
        occurredAt: now,
        note: `Moved from ${existing.status} to ${next}`,
        createdAt: now,
      };
      await evCol.insertOne(ev).catch(() => {});
    }
  }
  if (body.dateApplied !== undefined) {
    const d = new Date(body.dateApplied as string);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid dateApplied" }, { status: 400 });
    }
    $set.dateApplied = d;
  }
  $set.updatedAt = new Date();

  const res = await col.findOneAndUpdate(
    { _id: id, userId: new ObjectId(session.userId) },
    { $set },
    { returnDocument: "after" }
  );
  await cacheDel(`analytics:${session.userId}`).catch(() => {});

  return NextResponse.json({ application: res ? serialize(res) : null });
}

/** DELETE /api/applications/[id] — remove an application. */
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
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const col = await applications();
  const res = await col.deleteOne({ _id: id, userId: new ObjectId(session.userId) });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  await cacheDel(`analytics:${session.userId}`).catch(() => {});
  return NextResponse.json({ ok: true });
}

function serialize(app: Application) {
  return {
    _id: app._id instanceof ObjectId ? app._id.toHexString() : String(app._id),
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