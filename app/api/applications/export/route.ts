import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications } from "@/lib/models";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** RFC-4180 escape: quote fields containing comma, quote or newline. */
function esc(v: string): string {
  const s = v ?? "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/applications/export — the user's applications as a CSV download
 * (jobhunt-applications.csv format + status/source/salary/notes columns).
 * Round-trips with POST /api/applications/import (#19).
 */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;

  const col = await applications();
  const docs = await col
    .find({ userId: new ObjectId(session.userId) })
    .sort({ dateApplied: 1 })
    .toArray();

  const header = [
    "date",
    "title",
    "company",
    "apply_url",
    "hiring_email",
    "status",
    "source",
    "salary",
    "notes",
  ];
  const lines = [
    header.join(","),
    ...docs.map((a) =>
      [
        a.dateApplied.toISOString().slice(0, 10),
        a.title,
        a.companyName || "",
        a.applyUrl || "",
        a.hiringEmail || "",
        a.status,
        a.source || "",
        a.salary || "",
        a.notes || "",
      ]
        .map(esc)
        .join(",")
    ),
  ];
  const csv = lines.join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="queuti-applications.csv"',
    },
  });
}