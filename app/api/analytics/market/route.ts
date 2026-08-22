import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { applications } from "@/lib/models";
import { requireSession } from "@/lib/auth";
import { parseSalary } from "@/lib/salary";

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

interface SalaryStat {
  label: string;
  avg: number;
  min: number;
  max: number;
  n: number;
}

interface TrendPoint {
  label: string;
  count: number;
}

interface OfferRate {
  label: string;
  rate: number;
  offers: number;
  total: number;
}

interface MarketPayload {
  byCompany: LabelCount[];
  bySource: LabelCount[];
  byRole: LabelCount[];
  responseDaysBySource: ResponseDays[];
  salaryByRole: SalaryStat[];
  trend: TrendPoint[];
  offerRateBySource: OfferRate[];
}

/** Monday of the week containing `d` (for trend bucketing). */
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
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
  const [byCompany, bySource, byRole, respAgg, raw] = await Promise.all([
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
    // Raw rows for the JS-computed salary / trend / offer stats (#33).
    col
      .find(
        { userId, archivedAt: null },
        { projection: { title: 1, salary: 1, source: 1, status: 1, dateApplied: 1 } }
      )
      .toArray(),
  ]);

  // --- salary stats: avg/min/max per role title (parseable figures only) ---
  const salByRole = new Map<string, number[]>();
  for (const a of raw) {
    const v = parseSalary(a.salary);
    if (v === null) continue;
    const key = (a.title || "(untitled)").trim();
    const arr = salByRole.get(key) ?? [];
    arr.push(v);
    salByRole.set(key, arr);
  }
  const salaryByRole: SalaryStat[] = Array.from(salByRole.entries())
    .map(([label, vals]) => ({
      label,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      min: Math.min(...vals),
      max: Math.max(...vals),
      n: vals.length,
    }))
    .sort((x, y) => y.avg - x.avg)
    .slice(0, 8);

  // --- applications-over-time: last 12 ISO weeks (this week inclusive) ---
  const now = new Date();
  const start = weekStart(now);
  start.setDate(start.getDate() - 11 * 7);
  const weeks = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const w = new Date(start);
    w.setDate(w.getDate() + i * 7);
    weeks.set(w.toISOString().slice(0, 10), 0);
  }
  for (const a of raw) {
    if (!a.dateApplied) continue;
    const ws = weekStart(new Date(a.dateApplied)).toISOString().slice(0, 10);
    if (weeks.has(ws)) weeks.set(ws, weeks.get(ws)! + 1);
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const trend: TrendPoint[] = Array.from(weeks.entries()).map(([iso, count]) => ({
    label: fmt(new Date(iso)),
    count,
  }));

  // --- offer rate by source ---
  const bySrc = new Map<string, { total: number; offers: number }>();
  for (const a of raw) {
    const key = (a.source || "(blank)").trim();
    const e = bySrc.get(key) ?? { total: 0, offers: 0 };
    e.total += 1;
    if (a.status === "offer") e.offers += 1;
    bySrc.set(key, e);
  }
  const offerRateBySource: OfferRate[] = Array.from(bySrc.entries())
    .map(([label, e]) => ({
      label,
      rate: e.total ? Math.round((e.offers / e.total) * 100) : 0,
      offers: e.offers,
      total: e.total,
    }))
    .sort((x, y) => y.rate - x.rate);

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
      salaryByRole,
      trend,
      offerRateBySource,
    } satisfies MarketPayload,
  });
}