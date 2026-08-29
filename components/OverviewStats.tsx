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

interface Stat {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card elevation={2} className="flex flex-col items-center text-center p-4">
      <span className="text-xl">{stat.icon}</span>
      <p className="mt-2 text-2xl font-bold text-text-primary">
        {stat.value}
      </p>
      <p className="mt-1 text-sm font-medium text-text-secondary">
        {stat.label}
      </p>
      {stat.sub && (
        <p className="mt-0.5 text-xs text-text-tertiary">{stat.sub}</p>
      )}
    </Card>
  );
}

/**
 * Overview stat cards: total applications, active pipeline, interviews,
 * offers, avg response days, response rate.
 *
 * Reads live numbers from GET /api/analytics. On 401 (signed out — e.g. the
 * public home page) renders a sign-in prompt instead of numbers.
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
  const activePipeline = (byStatus.applied ?? 0) + (byStatus.screening ?? 0) + (byStatus.interview ?? 0);
  const interviews = byStatus.interview ?? 0;
  const offers = data.totals.offers;
  const total = data.totals.total;
  const responseRate = total
    ? Math.round((data.totals.responded / total) * 100)
    : 0;

  const stats: Stat[] = [
    { icon: "📥", label: "Total applications", value: String(total) },
    {
      icon: "🧭",
      label: "Active pipeline",
      value: String(activePipeline),
      sub: "applied · screening · interview",
    },
    { icon: "🤝", label: "Interviews", value: String(interviews) },
    { icon: "🏆", label: "Offers", value: String(offers) },
    {
      icon: "⏱️",
      label: "Avg response",
      value: data.avgResponseDays === null ? "—" : `${data.avgResponseDays}d`,
      sub: data.respondedCount ? `${data.respondedCount} responded` : undefined,
    },
    { icon: "📈", label: "Response rate", value: `${responseRate}%` },
  ];

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-text-primary">
        Overview
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>
    </section>
  );
}
