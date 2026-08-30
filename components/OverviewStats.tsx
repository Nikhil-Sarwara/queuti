"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

export type OverviewStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

interface OverviewData {
  funnel: { status: OverviewStatus; count: number }[];
  avgResponseDays: number | null;
  respondedCount: number;
  totals: {
    total: number;
    responded: number;
    offers: number;
    ghosted: number;
  };
}

const STAGE_META: Record<OverviewStatus, { label: string; color: string; barColor: string }> = {
  applied:    { label: "Applied",    color: "text-success", barColor: "bg-success" },
  screening:  { label: "Screening",  color: "text-warning", barColor: "bg-warning" },
  interview:  { label: "Interview",  color: "text-info",    barColor: "bg-info" },
  offer:      { label: "Offer",      color: "text-success", barColor: "bg-success" },
  rejected:   { label: "Rejected",   color: "text-error",   barColor: "bg-error" },
  ghosted:    { label: "Ghosted",    color: "text-text-secondary", barColor: "bg-text-secondary" },
};

const FUNNEL_ORDER: OverviewStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
];

function timeAgo(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Compact overview strip: hero stat + pipeline funnel bar + key metrics.
 * Reads live from GET /api/analytics.
 */
export function OverviewStats() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          setSignedOut(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as OverviewData;
      })
      .then((d) => d && setData(d))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load overview")
      );
  }, []);

  if (signedOut) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">
            Your overview, at a glance
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Applications, pipelines, interviews, offers and response rates —
            live from your tracker.{" "}
            <span className="text-text-tertiary">(Requires sign-in.)</span>
          </p>
        </div>
        <Link
          href="/login"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-accent-hover active:scale-[0.98]"
        >
          Sign in
        </Link>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="text-sm text-error" role="alert">
        Could not load overview: {error}
      </Card>
    );
  }
  if (!data) {
    return (
      <Card className="text-sm text-text-secondary">
        Loading overview…
      </Card>
    );
  }

  const byStatus = Object.fromEntries(
    data.funnel.map((f) => [f.status, f.count])
  );
  const total = data.totals.total;
  const activePipeline =
    (byStatus.applied ?? 0) + (byStatus.screening ?? 0) + (byStatus.interview ?? 0);
  const interviews = byStatus.interview ?? 0;
  const screening = byStatus.screening ?? 0;
  const offers = data.totals.offers;
  const rejected = data.totals.rejected ?? 0;
  const ghosted = data.totals.ghosted;
  const responseRate = total
    ? Math.round((data.totals.responded / total) * 100)
    : 0;
  const offerRate = total ? Math.round((offers / total) * 100) : 0;
  const ghostRate = total ? Math.round((ghosted / total) * 100) : 0;

  // Funnel bar segments
  const funnelCounts = FUNNEL_ORDER.map((s) => byStatus[s] ?? 0);
  const funnelTotal = Math.max(1, funnelCounts.reduce((a, b) => a + b, 0));

  return (
    <section className="mt-8">
      {/* ── Row 1: Hero + Pipeline funnel bar + Key metrics ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {/* Hero stat + funnel bar */}
        <Card className="flex flex-1 flex-col justify-between p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary">{total}</span>
              <span className="text-sm font-medium text-text-secondary">applications</span>
            </div>
            <span className="text-xs text-text-tertiary">
              {responseRate}% response · {offerRate}% offer
            </span>
          </div>

          {/* Inline pipeline funnel */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              <span>Pipeline</span>
              <span>{activePipeline} active</span>
            </div>
            <div className="flex h-5 overflow-hidden rounded-md border border-border-subtle">
              {funnelCounts.map((count, i) => {
                const pct = (count / funnelTotal) * 100;
                if (pct === 0) return null;
                const stage = FUNNEL_ORDER[i];
                return (
                  <div
                    key={stage}
                    className={`${STAGE_META[stage].barColor} relative flex items-center justify-center transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                    title={`${STAGE_META[stage].label}: ${count}`}
                  >
                    {pct > 8 && (
                      <span className="text-[10px] font-bold text-white drop-shadow-sm">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Funnel legend */}
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {FUNNEL_ORDER.map((stage) => {
                const count = byStatus[stage] ?? 0;
                if (count === 0) return null;
                return (
                  <span key={stage} className="flex items-center gap-1 text-[10px] text-text-tertiary">
                    <span className={`h-1.5 w-1.5 rounded-full ${STAGE_META[stage].barColor}`} />
                    {STAGE_META[stage].label}
                    <span className="font-semibold text-text-secondary">{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Key metrics — 2×2 compact grid */}
        <div className="grid grid-cols-2 gap-3 lg:w-[320px]">
          <MetricPill
            icon="🤝"
            value={String(interviews)}
            label="Interviews"
            accent={interviews > 0}
          />
          <MetricPill
            icon="🏆"
            value={String(offers)}
            label="Offers"
            accent={offers > 0}
          />
          <MetricPill
            icon="⏱️"
            value={data.avgResponseDays === null ? "—" : `${data.avgResponseDays}d`}
            label="Avg response"
          />
          <MetricPill
            icon="👻"
            value={`${ghostRate}%`}
            label="Ghosted"
            muted={ghostRate < 10}
          />
        </div>
      </div>

      {/* ── Row 2: Conversion funnel strip ── */}
      <Card className="mt-3 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Conversion funnel
          </h3>
          <span className="text-[10px] text-text-tertiary">
            Applied → Screening → Interview → Offer
          </span>
        </div>
        <div className="flex items-center gap-0">
          {FUNNEL_ORDER.map((stage, i) => {
            const count = byStatus[stage] ?? 0;
            const convRate = total > 0 ? Math.round((count / total) * 100) : 0;
            const prevCount = i > 0 ? (byStatus[FUNNEL_ORDER[i - 1]] ?? 0) : total;
            const stageConvRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;

            return (
              <div key={stage} className="flex flex-1 items-center">
                {/* Stage block */}
                <div className="flex flex-1 flex-col items-center">
                  <span className={`text-lg font-bold ${STAGE_META[stage].color}`}>
                    {count}
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold text-text-secondary">
                    {STAGE_META[stage].label}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {convRate}%
                  </span>
                </div>
                {/* Arrow */}
                {i < FUNNEL_ORDER.length - 1 && (
                  <div className="flex flex-col items-center px-1">
                    <span className="text-[10px] font-bold text-text-tertiary">
                      {stageConvRate}%
                    </span>
                    <span className="text-text-tertiary">→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

/* ── Compact metric pill ── */
function MetricPill({
  icon,
  value,
  label,
  accent = false,
  muted = false,
}: {
  icon: string;
  value: string;
  label: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-150 ${
        accent
          ? "border-accent/20 bg-accent/5"
          : muted
            ? "border-border-subtle bg-elevated/50 opacity-70"
            : "border-border-subtle bg-elevated"
      }`}
    >
      <span className="text-base">{icon}</span>
      <div className="min-w-0">
        <p className={`text-sm font-bold leading-tight ${muted ? "text-text-tertiary" : "text-text-primary"}`}>
          {value}
        </p>
        <p className="text-[10px] font-medium text-text-tertiary truncate">{label}</p>
      </div>
    </div>
  );
}
