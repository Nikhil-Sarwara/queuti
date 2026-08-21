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

const STAGE_META: Record<AnalyticsStatus, { label: string; bar: string }> = {
  applied: { label: "Applied", bar: "from-brass-light to-brass" },
  screening: { label: "Screening", bar: "from-leather-300 to-leather-500" },
  interview: { label: "Interview", bar: "from-moss-light to-moss" },
  offer: { label: "Offer", bar: "from-moss to-moss-light" },
  rejected: { label: "Rejected", bar: "from-blood-light to-blood" },
  ghosted: { label: "Ghosted", bar: "from-ink/50 to-ink/70" },
};

const MAX_BAR_WIDTH = 100;

/** Skeuomorphic analytics panel — funnel, avg response days, source performance (#7). */
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
    return (
      <Card className="text-sm text-blood-dark">
        ⚠️ Could not load analytics: {error}
      </Card>
    );
  }
  if (!data) {
    return (
      <Card className="text-sm opacity-70">
        📊 Loading analytics dashboard…
      </Card>
    );
  }

  const maxCount = Math.max(1, ...data.funnel.map((f) => f.count));
  const offerRate = data.totals.total
    ? Math.round((data.totals.offers / data.totals.total) * 100)
    : 0;
  const ghostRate = data.totals.total
    ? Math.round((data.totals.ghosted / data.totals.total) * 100)
    : 0;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-engraved">
        📊 Analytics
      </h2>

      {/* KPI strip */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-engraved">{data.totals.total}</p>
          <p className="mt-1 text-xs uppercase tracking-wide opacity-70">Applied</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-engraved">
            {data.avgResponseDays === null ? "—" : `${data.avgResponseDays}d`}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide opacity-70">
            Avg response ({data.respondedCount})
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-engraved">{offerRate}%</p>
          <p className="mt-1 text-xs uppercase tracking-wide opacity-70">Offer rate</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-engraved">{ghostRate}%</p>
          <p className="mt-1 text-xs uppercase tracking-wide opacity-70">Ghosted</p>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {/* Funnel */}
        <Card>
          <h3 className="font-display text-sm font-bold text-engraved">
            🧪 Funnel by stage
          </h3>
          <ul className="mt-3 space-y-2">
            {data.funnel.map((f) => (
              <li key={f.status}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{STAGE_META[f.status].label}</span>
                  <span className="font-bold">{f.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-sm border border-ink/20 bg-paper-dark shadow-[inset_0_1px_2px_rgba(43,33,23,.35)]">
                  <div
                    className={`h-full rounded-sm bg-gradient-to-b ${STAGE_META[f.status].bar} shadow-bevel-sm transition-all duration-500`}
                    style={{
                      width: `${(f.count / maxCount) * MAX_BAR_WIDTH}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Sources */}
        <Card>
          <h3 className="font-display text-sm font-bold text-engraved">
            🪧 Source performance
          </h3>
          {data.sources.length === 0 ? (
            <p className="mt-3 text-sm opacity-60">
              No application sources recorded yet — set a source (e.g. linkedin,
              seek, direct) when adding applications.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.sources.map((s) => {
                const pct = data.totals.total
                  ? Math.round((s.count / data.totals.total) * 100)
                  : 0;
                return (
                  <li
                    key={s.source}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{s.source}</span>
                    <span className="flex items-center gap-2">
                      <span className="hidden h-2 w-24 overflow-hidden rounded-sm border border-ink/20 bg-paper-dark shadow-[inset_0_1px_2px_rgba(43,33,23,.35)] sm:block">
                        <span
                          className="block h-full rounded-sm bg-gradient-to-b from-brass-light to-brass shadow-bevel-sm"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-16 text-right font-bold">
                        {s.count} · {pct}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}