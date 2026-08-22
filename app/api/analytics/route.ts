import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { cacheGet, cacheSet } from "@/lib/redis";
import { followUpDays } from "@/lib/followup";
import type { ApplicationStatus } from "@/lib/models";

export const dynamic = "force-dynamic";

/** Analytics cache TTL (s) (#29). */
const ANALYTICS_CACHE_TTL = 30;

const STATUSES: ApplicationStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

interface AnalyticsPayload {
  funnel: { status: ApplicationStatus; count: number }[];
  avgResponseDays: number | null;
  respondedCount: number;
  sources: { source: string; count: number }[];
  totals: { total: number; responded: number; offers: number; ghosted: number };
  followUps: {
    _id: string;
    title: string;
    companyName: string;
    status: ApplicationStatus;
    dateApplied: string;
    days: number;
  }[];
}

/** Compute per-user analytics from Mongo. */
async function computeAnalytics(userId: ObjectId): Promise<AnalyticsPayload> {
  const col = await applications();
  const [funnel, avgAgg, sources, totals, stale] = await Promise.all([
    col
      .aggregate<{ _id: ApplicationStatus; count: number }>([
        { $match: { userId, archivedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
    col
      .aggregate<{ _id: null; avgDays: number | null; n: number }>([
        {
          $match: {
            userId,
            archivedAt: null,
            respondedAt: { $exists: true, $ne: null },
            dateApplied: { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            days: {
              $divide: [
                { $subtract: ["$respondedAt", "$dateApplied"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: "$days" },
            n: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    col
      .aggregate<{ _id: string; count: number }>([
        { $match: { userId, archivedAt: null, source: { $ne: "" } } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    col
      .aggregate<{ _id: null; total: number; responded: number; offers: number; ghosted: number }>([
        {
          $match: { userId, archivedAt: null },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            responded: {
              $sum: { $cond: [{ $in: ["$status", ["screening", "interview", "offer", "rejected"]] }, 1, 0] },
            },
            offers: { $sum: { $cond: [{ $eq: ["$status", "offer"] }, 1, 0] } },
            ghosted: { $sum: { $cond: [{ $eq: ["$status", "ghosted"] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    // Follow-up candidates: only statuses that can go stale, filtered in JS
    // by the shared staleness rules (#30).
    col
      .find(
        { userId, archivedAt: null, status: { $in: ["applied", "screening", "ghosted"] } },
        {
          projection: {
            title: 1,
            companyName: 1,
            status: 1,
            dateApplied: 1,
            respondedAt: 1,
            updatedAt: 1,
          },
        }
      )
      .toArray(),
  ]);

  const funnelMap = Object.fromEntries(funnel.map((f) => [f._id, f.count]));
  const funnelOut: AnalyticsPayload["funnel"] = STATUSES.map((s) => ({
    status: s,
    count: funnelMap[s] || 0,
  }));
  const avg = avgAgg[0];
  const tot = totals[0];
  const now = Date.now();

  const followUps = stale
    .map((a) => ({
      _id: a._id!.toHexString(),
      title: a.title,
      companyName: a.companyName || "",
      status: a.status,
      dateApplied: a.dateApplied.toISOString(),
      days: followUpDays(a, now)!,
    }))
    .filter((f) => f.days !== null)
    .sort((x, y) => y.days - x.days)
    .slice(0, 8);

  return {
    funnel: funnelOut,
    avgResponseDays: avg && avg.avgDays !== null ? Math.round(avg.avgDays * 10) / 10 : null,
    respondedCount: avg ? avg.n : 0,
    sources: sources.map((s) => ({ source: s._id || "(blank)", count: s.count })),
    totals: {
      total: tot ? tot.total : 0,
      responded: tot ? tot.responded : 0,
      offers: tot ? tot.offers : 0,
      ghosted: tot ? tot.ghosted : 0,
    },
    followUps,
  };
}

/**
 * GET /api/analytics — per-user aggregations over applications:
 * - funnel: counts per kanban stage
 * - avgResponseDays: mean days from dateApplied → respondedAt
 *   (respondedAt set on first status move off "applied", excluding ghosted)
 * - sources: applications per source (row counts)
 * - totals: applied, responded, offerRate, ghostRate
 *
 * Upstash-backed cache-aside (30s TTL, per-user); falls back to Mongo
 * directly when Redis env vars are absent.
 */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const userId = new ObjectId(session.userId);

  const cacheKey = `analytics:${session.userId}`;
  const hit = await cacheGet<AnalyticsPayload>(cacheKey);
  if (hit) {
    return NextResponse.json(hit, { headers: { "x-cache": "HIT" } });
  }
  const payload = await computeAnalytics(userId);
  await cacheSet(cacheKey, payload, ANALYTICS_CACHE_TTL);
  return NextResponse.json(payload, { headers: { "x-cache": "MISS" } });
}