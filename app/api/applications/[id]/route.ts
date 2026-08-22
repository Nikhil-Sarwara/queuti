import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications, events } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cacheDel, bumpUserCache } from "@/lib/redis";
import { cleanStr, isHttpUrl, strTooLong } from "@/lib/validate";
import { needsFollowUp } from "@/lib/followup";
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
  "jd",
] as const;

// Display-name → max length map used to validate PATCH bodies.
const FIELD_LIMITS: Record<(typeof EDITABLE_FIELDS)[number], number> = {
  title: 200,
  companyName: 200,
  applyUrl: 500,
  hiringEmail: 200,
  source: 50,
  salary: 100,
  notes: 10000,
  jd: 50000,
};

const str = cleanStr;

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
    // Accept `company` as an alias for `companyName` (#28) — the form field
    // and CSV column are named `company`, the API field `companyName`.
    const raw =
      f === "companyName" && body.companyName === undefined
        ? body.company
        : body[f];
    if (raw !== undefined) {
      const value = str(raw);
      if (strTooLong(value, FIELD_LIMITS[f])) {
        return NextResponse.json(
          { error: `${f} must be ≤ ${FIELD_LIMITS[f]} characters` },
          { status: 400 }
        );
      }
      if (f === "applyUrl" && value && !isHttpUrl(value)) {
        return NextResponse.json(
          { error: "applyUrl must be a valid http(s) URL" },
          { status: 400 }
        );
      }
      if (
        f === "hiringEmail" &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        return NextResponse.json(
          { error: "hiringEmail must be a valid email" },
          { status: 400 }
        );
      }
      $set[f] = value;
    }
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
  // Restore from the archive (#26): PATCH { archived: false }.
  if (body.archived === false) {
    $set.archivedAt = null;
  }
  $set.updatedAt = new Date();

  const res = await col.findOneAndUpdate(
    { _id: id, userId: new ObjectId(session.userId) },
    { $set },
    { returnDocument: "after" }
  );
  await bumpUserCache(session.userId);
  await cacheDel(`analytics:${session.userId}`).catch(() => {});

  return NextResponse.json({ application: res ? serialize(res) : null });
}

/** DELETE /api/applications/[id] — archive (soft delete, #26). The row stays
 *  in the database with archivedAt set; the archive view can restore it. */
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
  const now = new Date();
  const res = await col.findOneAndUpdate(
    { _id: id, userId: new ObjectId(session.userId) },
    { $set: { archivedAt: now, updatedAt: now } },
    { returnDocument: "after" }
  );
  if (!res) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  await bumpUserCache(session.userId);
  await cacheDel(`analytics:${session.userId}`).catch(() => {});
  return NextResponse.json({ ok: true, archived: true });
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
    jd: app.jd || "",
    archivedAt: app.archivedAt ? app.archivedAt.toISOString() : null,
    needsFollowUp: needsFollowUp(app),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}