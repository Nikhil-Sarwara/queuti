import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications, events } from "@/lib/models";
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

async function ownApplication(id: ObjectId, userId: ObjectId): Promise<boolean> {
  const col = await applications();
  return (await col.countDocuments({ _id: id, userId })) > 0;
}

/** GET /api/applications/[id]/events — stage history for one application, oldest first. */
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
  if (!(await ownApplication(id, new ObjectId(session.userId)))) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const col = await events();
  const docs = await col
    .find({ applicationId: id, userId: new ObjectId(session.userId) })
    .sort({ occurredAt: 1, createdAt: 1 })
    .toArray();
  return NextResponse.json({ events: docs.map(serialize) });
}

/** POST /api/applications/[id]/events — add a manual timeline entry (follow-up, note…). */
export async function POST(
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
  const userId = new ObjectId(session.userId);
  if (!(await ownApplication(id, userId))) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const str = (v: unknown) =>
    typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  const type = str(body.type) || "note";
  if (!EVENT_TYPES.includes(type as (typeof EVENT_TYPES)[number])) {
    return NextResponse.json(
      { error: `Invalid event type: ${type}` },
      { status: 400 }
    );
  }
  const dateRaw = str(body.occurredAt) || new Date().toISOString();
  const occurredAt = new Date(dateRaw);
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Invalid occurredAt" }, { status: 400 });
  }

  const col = await events();
  const now = new Date();
  const doc: ApplicationEvent = {
    userId,
    applicationId: id,
    type,
    occurredAt,
    note: str(body.note),
    questions: normalizeQuestions(body.questions),
    prepNote:
      typeof body.prepNote === "string" && body.prepNote.trim()
        ? body.prepNote.trim()
        : undefined,
    createdAt: now,
  };
  const res = await col.insertOne(doc);

  return NextResponse.json(
    { event: serialize({ ...doc, _id: res.insertedId }) },
    { status: 201 }
  );
}