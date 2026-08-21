import { NextResponse } from "next/server";
import { pingDb } from "@/lib/mongodb";
import { ensureIndexes } from "@/lib/models";
import { redisEnabled, redisPing } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — DB + Redis + index healthcheck.
 * Used by the deploy smoke test and any uptime monitor.
 */
export async function GET() {
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
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
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