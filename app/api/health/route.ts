import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pingDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/models";
import { redisEnabled, redisPing } from "@/lib/redis";
import { getLastErrors, getUptime } from "@/lib/logging";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — DB + Redis + index healthcheck, uptime, and a summary of
 * the most recent recorded errors (ring buffer from lib/logging, #40).
 * Used by the deploy smoke test and any uptime monitor.
 */
export async function GET(req: NextRequest) {
  const [db, redis, indexes] = await Promise.allSettled([
    pingDb(),
    redisPing(),
    ensureIndexes(),
  ]);

  const dbResult = db.status === "fulfilled" ? db.value : { ok: false, error: String(db.reason) };
  const redisResult =
    redis.status === "fulfilled" ? redis.value : { ok: false, note: String(redis.reason) };
  const indexResult =
    indexes.status === "fulfilled" ? { ok: true } : { ok: false, error: String(indexes.reason) };

  const ok = dbResult.ok && indexResult.ok;
  const lastErrors = getLastErrors(5);

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      uptimeSeconds: getUptime(),
      requestId: req.headers.get("x-request-id") ?? null,
      lastErrors: {
        count: lastErrors.length,
        recent: lastErrors,
      },
      db: dbResult,
      redis: {
        ok: redisResult.ok,
        enabled: redisEnabled(),
        latencyMs: redisResult.latencyMs,
        note: redisResult.note,
      },
      indexes: indexResult,
      collections: ["users", "applications", "events", "contacts", "companies"],
    },
    { status: ok ? 200 : 503 }
  );
}