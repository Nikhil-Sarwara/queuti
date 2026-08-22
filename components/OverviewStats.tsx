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

/** Recessed engraved value on a paper ledger — reads like a pressed stamp. */
function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card material="paper" framed className="text-center">
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-brass-dark/50 bg-gradient-to-b from-brass-light to-brass text-base shadow-bevel-sm">
        {stat.icon}
      </span>
      <p className="mt-2 font-display text-3xl font-bold text-engraved">
        {stat.value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wider opacity-70">
        {stat.label}
      </p>
      {stat.sub && <p className="text-[11px] opacity-50">{stat.sub}</p>}
    </Card>
  );
}

/**
 * Skeuomorphic overview stat cards (#12): total applications, active
 * pipeline, interviews, offers, avg response days, response rate.
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

  // Public page, no session — invite to the tracker instead of numbers.
  if (signedOut) {
    return (
      <Card material="leather" framed className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-paper-light">
            🗂️ Your overview, at a glance
          </h2>
          <p className="mt-1 text-sm text-paper-light/75">
            Applications, pipelines, interviews, offers and response rates —
            live from your tracker.{" "}
            <span className="text-paper-light/60">(Requires sign-in.)</span>
          </p>
        </div>
        <Link
          href="/login"
          className="rounded-md border-2 border-b-4 border-brass-dark bg-gradient-to-b from-brass-light to-brass px-4 py-2 text-sm font-semibold text-ink shadow-bevel-sm transition active:translate-y-px active:border-b-2"
        >
          Sign in
        </Link>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="text-sm text-blood-dark">
        ⚠️ Could not load overview: {error}
      </Card>
    );
  }
  if (!data) {
    return (
      <Card className="text-sm opacity-70">
        🗂️ Loading overview…
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
      <h2 className="font-display text-lg font-bold text-engraved">
        🗂️ Overview
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>
    </section>
  );
}