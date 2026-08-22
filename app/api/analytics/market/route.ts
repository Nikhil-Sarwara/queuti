import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications } from "@/lib/models";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface LabelCount {
  label: string;
  count: number;
}

interface ResponseDays {
  source: string;
  avgDays: number;
  n: number;
}

interface MarketPayload {
  byCompany: LabelCount[];
  bySource: LabelCount[];
  byRole: LabelCount[];
  responseDaysBySource: ResponseDays[];
}

/**
 * Market intelligence aggregations (#18) — the differentiator view.
 * - byCompany: applications per company (top 12)
 * - bySource: applications per source/channel
 * - byRole: applications per job title (top 12)
 * - responseDaysBySource: avg (respondedAt - dateApplied) per source
 * Powered by /stats with recharts charts.
 */
export async function GET(req: Request) {
  const auth = await requireSession(req);
  if ("error" in auth) return auth.error;
  const { session } = auth;
  const userId = new ObjectId(session.userId);

  const col = await applications();
  const [byCompany, bySource, byRole, respAgg] = await Promise.all([
    col
      .aggregate<{ _id: string; count: number }>([
        { $match: { userId, archivedAt: null, companyName: { $ne: "" } } },
        { $group: { _id: "$companyName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
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
      .aggregate<{ _id: string; count: number }>([
        { $match: { userId, archivedAt: null } },
        { $group: { _id: "$title", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ])
      .toArray(),
    col
      .aggregate<ResponseDays>([
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
            source: { $ifNull: ["$source", ""] },
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
            _id: "$source",
            avgDays: { $avg: "$days" },
            n: { $sum: 1 },
          },
        },
        { $sort: { avgDays: 1 } },
      ])
      .toArray(),
  ]);

  const labelCount = (rows: { _id: string; count: number }[]): LabelCount[] =>
    rows.map((r) => ({ label: r._id || "(blank)", count: r.count }));

  return NextResponse.json({
    market: {
      byCompany: labelCount(byCompany),
      bySource: labelCount(bySource),
      byRole: labelCount(byRole),
      responseDaysBySource: respAgg.map((r) => ({
        source: r.source || "(unknown)",
        avgDays: Math.round(r.avgDays * 10) / 10,
        n: r.n,
      })),
    } satisfies MarketPayload,
  });
}