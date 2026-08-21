import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cacheDel } from "@/lib/redis";
import { parseCsvObjects } from "@/lib/csv";
import type { Application } from "@/lib/models";

export const dynamic = "force-dynamic";

/**
 * POST /api/applications/import
 * Body: { csv: string } — jobhunt-applications.csv format:
 *   date,title,company,apply_url,hiring_email
 * Idempotent: skips rows that already exist for this user
 * (same title + company + date). Returns counts.
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
  const errors: string[] = [];
  const now = new Date();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = r.title;
    const companyName = r.company || "";
    if (!title) {
      invalid++;
      continue;
    }
    // Parse date: YYYY-MM-DD or ISO; fall back to today.
    let dateApplied = new Date(r.date || "");
    if (Number.isNaN(dateApplied.getTime())) dateApplied = now;

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
      imported++;
    } catch (e) {
      invalid++;
      errors.push(`row ${i + 2}: ${e instanceof Error ? e.message : "write failed"}`);
    }
  }

  // Import shifts counts — drop the analytics cache for this user.
  await cacheDel(`analytics:${session.userId}`).catch(() => {});

  return NextResponse.json({
    imported,
    skipped,
    invalid,
    errors: errors.slice(0, 10),
  });
}