import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cacheDel, bumpUserCache } from "@/lib/redis";
import { parseCsvObjects } from "@/lib/csv";
import type { Application } from "@/lib/models";

export const dynamic = "force-dynamic";

/**
 * POST /api/applications/import
 * Body: { csv: string } — jobhunt-applications.csv format:
 *   date,title,company,apply_url,hiring_email
 * Idempotent: skips rows that already exist for this user
 * (same title + company + date). Flags company+title duplicates (#26).
 * Returns counts.
 */
export async function POST(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  let body: { csv?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.csv !== "string" || !body.csv.trim()) {
    return NextResponse.json(
      { error: "csv field (string) is required" },
      { status: 400 }
    );
  }

  const { header, rows } = parseCsvObjects(body.csv.slice(0, 2_000_000));
  const required = ["title", "company"];
  const missing = required.filter((h) => !header.includes(h));
  if (missing.length) {
    return NextResponse.json(
      { error: `CSV header missing column(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "CSV has no data rows" },
      { status: 400 }
    );
  }

  const col = await applications();
  const userId = new ObjectId(session.userId);

  let imported = 0;
  let skipped = 0;
  let invalid = 0;
  let duplicates = 0;
  const errors: string[] = [];
  const duplicateMessages: string[] = [];
  const now = new Date();

  // Duplicate detection (#26): a row is a duplicate if the user already has
  // an application with the same company + title (case-insensitive), or the
  // same row appears twice in this file. Exact title+company+date matches
  // stay counted as plain skips for idempotent re-imports of the same file.
  const existing = await col
    .find(
      { userId },
      { projection: { title: 1, companyName: 1 } }
    )
    .toArray();
  const existingKeys = new Set(
    existing.map(
      (a) =>
        `${a.title.trim().toLowerCase()}|${(a.companyName || "").trim().toLowerCase()}`
    )
  );
  const fileKeys = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = r.title;
    const companyName = r.company || "";
    if (!title) {
      invalid++;
      errors.push(`row ${i + 2}: missing title`);
      continue;
    }
    // Parse date: YYYY-MM-DD or ISO; fall back to today.
    let dateApplied = new Date(r.date || "");
    if (Number.isNaN(dateApplied.getTime())) {
      errors.push(`row ${i + 2}: invalid date "${r.date || ""}" — used today`);
      dateApplied = now;
    }

    // Idempotency: skip if this user already has title+company+date.
    const dup = await col.findOne({
      userId,
      title,
      companyName,
      dateApplied,
    });
    if (dup) {
      skipped++;
      continue;
    }

    // Duplicate detection: same company + title already tracked (or twice
    // in this file) — flag it instead of silently importing.
    const key = `${title.trim().toLowerCase()}|${companyName.trim().toLowerCase()}`;
    if (fileKeys.has(key) || existingKeys.has(key)) {
      duplicates++;
      if (duplicateMessages.length < 10) {
        duplicateMessages.push(
          `row ${i + 2}: duplicate of "${title}" at "${companyName || "(no company)"}"`
        );
      }
      continue;
    }

    const doc: Application = {
      userId,
      title,
      companyName,
      applyUrl: r.apply_url || "",
      hiringEmail: r.hiring_email || "",
      source: "",
      status: "applied",
      dateApplied,
      salary: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    try {
      await col.insertOne(doc);
      fileKeys.add(key);
      imported++;
    } catch (e) {
      invalid++;
      errors.push(`row ${i + 2}: ${e instanceof Error ? e.message : "write failed"}`);
    }
  }

  // Import shifts counts — drop the analytics cache for this user.
  await bumpUserCache(session.userId);
  await cacheDel(`analytics:${session.userId}`).catch(() => {});

  return NextResponse.json({
    imported,
    skipped,
    duplicates,
    invalid,
    errors: errors.slice(0, 10),
    duplicateMessages,
  });
}