import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications, events } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cacheDel, bumpUserCache } from "@/lib/redis";
import type { ApplicationEvent, ApplicationStatus } from "@/lib/models";

export const dynamic = "force-dynamic";

const STATUSES: ApplicationStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

const MAX_IDS = 200;

/**
 * POST /api/applications/bulk — batch operations on multiple applications (#26).
 * Body (at least one of):
 *   { ids: string[], status: "interview" }   — bulk status change
 *   { ids: string[], archived: true|false }  — bulk archive / restore
 * Returns { ok, updated } where updated is the number of docs actually changed.
 */
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

  // ---- ids validation ----
  const rawIds = body.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return NextResponse.json(
      { error: "ids must be a non-empty array of application ids" },
      { status: 400 }
    );
  }
  if (rawIds.length > MAX_IDS) {
    return NextResponse.json(
      { error: `ids must be ≤ ${MAX_IDS} applications per bulk operation` },
      { status: 400 }
    );
  }
  const ids: ObjectId[] = [];
  for (const raw of rawIds) {
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "ids must be strings" }, { status: 400 });
    }
    try {
      ids.push(new ObjectId(raw));
    } catch {
      return NextResponse.json(
        { error: `Invalid application id: "${raw}"` },
        { status: 400 }
      );
    }
  }

  const hasStatus = body.status !== undefined;
  const hasArchived = body.archived !== undefined;
  if (!hasStatus && !hasArchived) {
    return NextResponse.json(
      { error: "Provide status and/or archived to run a bulk operation" },
      { status: 400 }
    );
  }
  if (hasStatus && !STATUSES.includes(body.status as ApplicationStatus)) {
    return NextResponse.json(
      { error: `Invalid status: ${body.status}` },
      { status: 400 }
    );
  }
  const next = body.status as ApplicationStatus | undefined;
  const archived = hasArchived ? Boolean(body.archived) : undefined;

  const col = await applications();
  const userId = new ObjectId(session.userId);
  const now = new Date();
  const match = { _id: { $in: ids }, userId };

  let updated = 0;
  let changedIds: ObjectId[] = [];

  if (next) {
    // Which of these are actually on a different stage?
    const docs = await col
      .find(match, { projection: { _id: 1, status: 1 } })
      .toArray();
    const staged = docs.filter((d) => d.status !== next);
    changedIds = staged.map((d) => d._id);
    if (changedIds.length > 0) {
      // First-response bookkeeping: applied → anything but ghosted sets respondedAt.
      const firstResponses = staged
        .filter((d) => d.status === "applied" && next !== "applied" && next !== "ghosted")
        .map((d) => d._id);
      const moves = staged.filter((d) => !firstResponses.includes(d._id));
      if (firstResponses.length > 0) {
        const r = await col.updateMany(
          { _id: { $in: firstResponses }, userId },
          { $set: { status: next, respondedAt: now, updatedAt: now } }
        );
        updated += r.modifiedCount;
      }
      if (moves.length > 0) {
        const r = await col.updateMany(
          { _id: { $in: moves.map((d) => d._id) }, userId },
          { $set: { status: next, updatedAt: now } }
        );
        updated += r.modifiedCount;
      }
      // Stage history for every app that moved.
      const evCol = await events();
      const evs: ApplicationEvent[] = staged.map((d) => ({
        userId,
        applicationId: d._id,
        type: next,
        occurredAt: now,
        note: `Bulk moved from ${d.status} to ${next}`,
        createdAt: now,
      }));
      await evCol.insertMany(evs).catch(() => {});
    }
  }

  if (archived !== undefined) {
    const r = archived
      ? await col.updateMany(
          { _id: { $in: ids }, userId },
          { $set: { archivedAt: now, updatedAt: now } }
        )
      : await col.updateMany(
          { _id: { $in: ids }, userId },
          { $set: { updatedAt: now }, $unset: { archivedAt: "" } }
        );
    updated += r.modifiedCount;
  }

  await bumpUserCache(session.userId);
  await cacheDel(`analytics:${session.userId}`).catch(() => {});

  return NextResponse.json({ ok: true, updated });
}