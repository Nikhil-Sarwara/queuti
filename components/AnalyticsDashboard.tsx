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

const STAGE_META: Record<AnalyticsStatus, { label: string; bar: string }> = {
  applied: { label: "Applied", bar: STATUS_TONE_CLS.applied },
  screening: { label: "Screening", bar: STATUS_TONE_CLS.screening },
  interview: { label: "Interview", bar: STATUS_TONE_CLS.interview },
  offer: { label: "Offer", bar: STATUS_TONE_CLS.offer },
  rejected: { label: "Rejected", bar: STATUS_TONE_CLS.rejected },
  ghosted: { label: "Ghosted", bar: STATUS_TONE_CLS.ghosted },
};

const MAX_BAR_WIDTH = 100;

/** Analytics panel — funnel, avg response days, source performance. */
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
      <Card className="text-sm text-error">
        Could not load analytics: {error}
      </Card>
    );
  }
  if (!data) {
    return (
      <Card className="text-sm text-text-secondary">
        Loading analytics dashboard…
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
      <h2 className="text-lg font-bold text-text-primary">
        Analytics
      </h2>

      {/* KPI strip */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-text-primary">{data.totals.total}</p>
          <p className="mt-1 text-sm font-medium text-text-secondary">Applied</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-text-primary">
            {data.avgResponseDays === null ? "—" : `${data.avgResponseDays}d`}
          </p>
          <p className="mt-1 text-sm font-medium text-text-secondary">
            Avg response ({data.respondedCount})
          </p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-text-primary">{offerRate}%</p>
          <p className="mt-1 text-sm font-medium text-text-secondary">Offer rate</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-bold text-text-primary">{ghostRate}%</p>
          <p className="mt-1 text-sm font-medium text-text-secondary">Ghosted</p>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {/* Funnel */}
        <Card>
          <h3 className="text-sm font-bold text-text-primary">
            Funnel by stage
          </h3>
          <ul className="mt-3 space-y-2">
            {data.funnel.map((f) => (
              <li key={f.status}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-text-secondary">{STAGE_META[f.status].label}</span>
                  <span className="font-bold text-text-primary">{f.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-md border border-border-subtle bg-elevated">
                  <div
                    className={`h-full rounded-md ${STAGE_META[f.status].bar} transition-all duration-500`}
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
          <h3 className="text-sm font-bold text-text-primary">
            Source performance
          </h3>
          {data.sources.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
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
                    <span className="truncate text-text-secondary">{s.source}</span>
                    <span className="flex items-center gap-2">
                      <span className="hidden h-2 w-24 overflow-hidden rounded-md border border-border-subtle bg-elevated sm:block">
                        <span
                          className="block h-full rounded-md bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-16 text-right font-bold text-text-primary">
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
