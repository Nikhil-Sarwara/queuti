"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

export type AnalyticsStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

interface AnalyticsData {
  funnel: { status: AnalyticsStatus; count: number }[];
  avgResponseDays: number | null;
  respondedCount: number;
  sources: { source: string; count: number }[];
  totals: { total: number; responded: number; offers: number; ghosted: number };
}

import { STATUS_TONE_CLS } from "@/lib/tones";

const STAGE_META: Record<AnalyticsStatus, { label: string; bar: string; icon: string; color: string }> = {
  applied:   { label: "Applied",   bar: STATUS_TONE_CLS.applied,   icon: "📥", color: "text-success" },
  screening: { label: "Screening", bar: STATUS_TONE_CLS.screening, icon: "🔍", color: "text-warning" },
  interview: { label: "Interview", bar: STATUS_TONE_CLS.interview, icon: "🤝", color: "text-info" },
  offer:     { label: "Offer",     bar: STATUS_TONE_CLS.offer,     icon: "🏆", color: "text-success" },
  rejected:  { label: "Rejected",  bar: STATUS_TONE_CLS.rejected,  icon: "❌", color: "text-error" },
  ghosted:   { label: "Ghosted",   bar: STATUS_TONE_CLS.ghosted,   icon: "👻", color: "text-text-secondary" },
};

/* ── Mini donut — CSS-only, no SVG dependency ── */
function MiniDonut({ segments, size = 48 }: { segments: { pct: number; color: string }[]; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} className="-rotate-90">
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * c;
        const o = offset;
        offset += dash;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="4"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-o}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

/** Analytics dashboard — compact single-card layout with inline KPIs + mini charts. */
export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as AnalyticsData;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load analytics"));
  }, []);

  if (error) {
    return <Card className="text-sm text-error">Could not load analytics: {error}</Card>;
  }
  if (!data) {
    return <Card className="text-sm text-text-secondary">Loading analytics…</Card>;
  }

  const maxCount = Math.max(1, ...data.funnel.map((f) => f.count));
  const total = data.totals.total || 1;
  const offerRate = Math.round((data.totals.offers / total) * 100);
  const ghostRate = Math.round((data.totals.ghosted / total) * 100);
  const activePipeline = (data.funnel.find((f) => f.status === "applied")?.count ?? 0)
    + (data.funnel.find((f) => f.status === "screening")?.count ?? 0)
    + (data.funnel.find((f) => f.status === "interview")?.count ?? 0);
  const responseRate = total > 0 ? Math.round(((total - data.funnel.find((f) => f.status === "applied")?.count! - data.funnel.find((f) => f.status === "ghosted")?.count!) / total) * 100) : 0;

  // Donut segments for funnel (top 4 stages)
  const donutSegments = data.funnel
    .filter((f) => f.status !== "rejected" && f.status !== "ghosted")
    .map((f) => ({
      pct: (f.count / Math.max(1, activePipeline)) * 100,
      color: f.status === "applied" ? "#22c55e" : f.status === "screening" ? "#f59e0b" : f.status === "interview" ? "#6366f1" : "#10b981",
    }));

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-text-primary">Analytics</h2>

      <Card className="mt-3 p-4">
        {/* ── Row 1: Compact KPI strip ── */}
        <div className="grid grid-cols-5 gap-3">
          <KpiCell label="Total" value={String(data.totals.total)} icon="📊" />
          <KpiCell label="Active" value={String(activePipeline)} icon="🚀" accent />
          <KpiCell label="Response" value={`${responseRate}%`} icon="💬" />
          <KpiCell label="Offers" value={`${offerRate}%`} icon="🏆" />
          <KpiCell
            label="Avg reply"
            value={data.avgResponseDays === null ? "—" : `${data.avgResponseDays}d`}
            icon="⏱️"
            sub={`${data.respondedCount} responded`}
          />
        </div>

        {/* ── Row 2: Funnel + Sources side-by-side ── */}
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_200px]">
          {/* Funnel bars — inline horizontal */}
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              Pipeline funnel
            </h3>
            <div className="space-y-1.5">
              {data.funnel.map((f) => (
                <div key={f.status} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[11px] font-medium text-text-secondary">
                    {STAGE_META[f.status].icon} {STAGE_META[f.status].label}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-md bg-elevated">
                    <div
                      className={`h-2.5 rounded-md ${STAGE_META[f.status].bar} transition-all duration-500`}
                      style={{ width: `${(f.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[11px] font-bold text-text-primary">
                    {f.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sources — compact donut + legend */}
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              Sources
            </h3>
            {data.sources.length === 0 ? (
              <p className="text-[11px] text-text-tertiary">No sources recorded yet.</p>
            ) : (
              <div className="flex items-center gap-3">
                <MiniDonut
                  size={56}
                  segments={data.sources.map((s, i) => ({
                    pct: (s.count / total) * 100,
                    color: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"][i % 6],
                  }))}
                />
                <ul className="space-y-0.5">
                  {data.sources.slice(0, 5).map((s, i) => (
                    <li key={s.source} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"][i % 6] }}
                      />
                      <span className="truncate text-text-secondary">{s.source}</span>
                      <span className="font-semibold text-text-primary">{s.count}</span>
                    </li>
                  ))}
                  {data.sources.length > 5 && (
                    <li className="text-[10px] text-text-tertiary">
                      +{data.sources.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Ghost rate warning bar (only if > 0) ── */}
        {data.totals.ghosted > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-error/5 px-3 py-1.5 text-[10px]">
            <span>👻</span>
            <span className="text-error">
              {data.totals.ghosted} application{data.totals.ghosted === 1 ? "" : "s"} ghosted
            </span>
            <span className="text-text-tertiary">({ghostRate}% — follow up or archive them)</span>
          </div>
        )}
      </Card>
    </section>
  );
}

/* ── Compact KPI cell ── */
function KpiCell({
  label,
  value,
  icon,
  accent = false,
  sub,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-sm">{icon}</span>
      <span className={`mt-0.5 text-lg font-bold leading-tight ${accent ? "text-accent" : "text-text-primary"}`}>
        {value}
      </span>
      <span className="text-[9px] font-medium text-text-tertiary">{label}</span>
      {sub && <span className="text-[8px] text-text-tertiary">{sub}</span>}
    </div>
  );
}
