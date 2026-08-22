import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { events } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import type { ApplicationEvent, PrepQuestion } from "@/lib/models";

export const dynamic = "force-dynamic";

const EVENT_TYPES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
  "follow_up",
  "note",
] as const;

const MAX_QUESTIONS = 50;

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

/** Normalize incoming questions into {text, done} entries (#34). */
function normalizeQuestions(raw: unknown): PrepQuestion[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: PrepQuestion[] = [];
  for (const q of raw.slice(0, MAX_QUESTIONS)) {
    if (typeof q === "string") {
      const t = q.trim();
      if (t) out.push({ text: t, done: false });
    } else if (q && typeof q === "object") {
      const o = q as Record<string, unknown>;
      if (typeof o.text === "string" && o.text.trim()) {
        out.push({ text: o.text.trim(), done: o.done === true });
      }
    }
  }
  return out;
}

function serialize(ev: ApplicationEvent) {
  return {
    _id: ev._id instanceof ObjectId ? ev._id.toHexString() : String(ev._id),
    applicationId:
      ev.applicationId instanceof ObjectId
        ? ev.applicationId.toHexString()
        : String(ev.applicationId),
    type: ev.type,
    occurredAt: ev.occurredAt.toISOString(),
    note: ev.note || "",
    questions: ev.questions || [],
    prepNote: ev.prepNote || "",
    createdAt: ev.createdAt.toISOString(),
  };
}

/** PATCH /api/applications/[id]/events/[eventId] — retitle/renote/redate an event. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; eventId: string } }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  let id: ObjectId;
  let eventId: ObjectId;
  try {
    id = new ObjectId(params.id);
    eventId = new ObjectId(params.eventId);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const $set: Partial<ApplicationEvent> = {};
  let $unset: Record<string, ""> | undefined;
  if (body.type !== undefined) {
    const type = str(body.type);
    if (!EVENT_TYPES.includes(type as (typeof EVENT_TYPES)[number])) {
      return NextResponse.json({ error: `Invalid event type: ${type}` }, { status: 400 });
    }
    $set.type = type;
  }
  if (body.note !== undefined) $set.note = str(body.note);
  if (body.occurredAt !== undefined) {
    const d = new Date(str(body.occurredAt));
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid occurredAt" }, { status: 400 });
    }
    $set.occurredAt = d;
  }
  if (body.questions !== undefined) {
    const qs = normalizeQuestions(body.questions);
    if (qs && qs.length) $set.questions = qs;
    else $unset = { ...($unset || {}), questions: "" };
  }
  if (body.prepNote !== undefined) {
    const pn = str(body.prepNote);
    if (pn) $set.prepNote = pn;
    else $unset = { ...($unset || {}), prepNote: "" };
  }

  const col = await events();
  const res = await col.findOneAndUpdate(
    { _id: eventId, applicationId: id, userId: new ObjectId(session.userId) },
    $unset ? { $set, $unset } : { $set },
    { returnDocument: "after" }
  );
  if (!res) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ event: serialize(res) });
}

/** DELETE /api/applications/[id]/events/[eventId] — remove a timeline entry. */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; eventId: string } }
) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  let id: ObjectId;
  let eventId: ObjectId;
  try {
    id = new ObjectId(params.id);
    eventId = new ObjectId(params.eventId);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const col = await events();
  const res = await col.deleteOne({
    _id: eventId,
    applicationId: id,
    userId: new ObjectId(session.userId),
  });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}