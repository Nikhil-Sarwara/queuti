import { NextResponse } from "next/server";
import { pingDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/models";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — DB + index healthcheck.
 * Used by the deploy smoke test and any uptime monitor.
 */
export async function GET() {
  const db = await pingDb();
  if (!db.ok) {
    return NextResponse.json(
      { status: "degraded", db: db },
      { status: 503 }
    );
  }

  // Fire-and-forget index ensure (idempotent; only after a successful ping).
  ensureIndexes().catch((err) =>
    console.error("[queuti] ensureIndexes failed:", err)
  );

  return NextResponse.json({
    status: "ok",
    db: db,
    collections: ["users", "applications", "events", "contacts", "companies"],
  });
}