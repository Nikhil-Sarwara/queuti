import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications, ensureIndexes, events } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cacheDel, cacheGet, cacheSet, userCacheVersion, bumpUserCache } from "@/lib/redis";
import { cleanStr, isHttpUrl, strTooLong, parsePagination, companyNameOf } from "@/lib/validate";
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

/** List cache TTL (s) — short, keeps the kanban/ledger fresh (#29). */
const LIST_CACHE_TTL = 30;

interface ListPayload {
  applications: ReturnType<typeof serialize>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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
    jd: app.jd || "",
    archivedAt: app.archivedAt ? app.archivedAt.toISOString() : null,
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
  const str = cleanStr;
  const fields = {
    title: str(body.title),
    companyName: companyNameOf(body),
    applyUrl: str(body.applyUrl),
    hiringEmail: str(body.hiringEmail),
    source: str(body.source),
    salary: str(body.salary),
    notes: str(body.notes),
    jd: str(body.jd),
    status,
    dateApplied,
  };
  if (!fields.title) throw new Error("Title is required");
  if (strTooLong(fields.title, 200)) throw new Error("Title must be ≤ 200 characters");
  if (strTooLong(fields.companyName, 200)) throw new Error("Company name must be ≤ 200 characters");
  if (fields.applyUrl && !isHttpUrl(fields.applyUrl)) {
    throw new Error("applyUrl must be a valid http(s) URL");
  }
  if (strTooLong(fields.applyUrl, 500)) throw new Error("applyUrl must be ≤ 500 characters");
  if (fields.hiringEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.hiringEmail)) {
    throw new Error("hiringEmail must be a valid email");
  }
  if (strTooLong(fields.hiringEmail, 200)) throw new Error("hiringEmail must be ≤ 200 characters");
  if (strTooLong(fields.source, 50)) throw new Error("source must be ≤ 50 characters");
  if (strTooLong(fields.salary, 100)) throw new Error("salary must be ≤ 100 characters");
  if (strTooLong(fields.notes, 10000)) throw new Error("notes must be ≤ 10000 characters");
  if (strTooLong(fields.jd, 50000)) throw new Error("jd must be ≤ 50000 characters");
  return fields;
}

/** GET /api/applications — paginated, sortable list of the user's applications.
 *  Archived apps are hidden by default; pass ?archived=1 for the archive view (#26).
 *  Cache-aside (Upstash Redis, 30s TTL): cache is keyed per user × list-version ×
 *  page params, so any write (version bump) invalidates every page at once (#29). */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const pageInfo = parsePagination(req.url, {
    defaultSort: "dateApplied",
    defaultOrder: "desc",
    sortable: ["dateApplied", "updatedAt", "title", "companyName", "status"],
  });
  if (!pageInfo.ok) {
    return NextResponse.json({ error: pageInfo.error }, { status: 400 });
  }
  const { page, limit, sort, order } = pageInfo;

  const archived = new URL(req.url).searchParams.get("archived") === "1";

  const cacheKey = [
    "apps:list",
    session.userId,
    await userCacheVersion(session.userId),
    archived ? 1 : 0,
    page,
    limit,
    sort,
    order,
  ].join(":");
  const hit = await cacheGet<ListPayload>(cacheKey);
  if (hit) {
    return NextResponse.json(hit, { headers: { "x-cache": "HIT" } });
  }

  const col = await applications();
  const filter = {
    userId: new ObjectId(session.userId),
    ...(archived
      ? { archivedAt: { $ne: null } }
      : { archivedAt: null }),
  };
  const [total, docs] = await Promise.all([
    col.countDocuments(filter),
    col
      .find(filter)
      .sort({ [sort]: order, _id: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
  ]);

  const payload: ListPayload = {
    applications: docs.map(serialize),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
  await cacheSet(cacheKey, payload, LIST_CACHE_TTL);
  return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
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
  await bumpUserCache(session.userId);
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