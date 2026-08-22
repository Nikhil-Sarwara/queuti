"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

interface FollowUpItem {
  _id: string;
  title: string;
  companyName: string;
  status: string;
  dateApplied: string;
  days: number;
}

/**
 * 'Needs follow-up' ledger strip (#30): applications sitting without a
 * response for 7+ days (applied/screening) or ghosted 3+ days ago, most
 * overdue first. Backed by GET /api/analytics (followUps).
 */
export function FollowUpPanel() {
  const [items, setItems] = useState<FollowUpItem[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          setSignedOut(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { followUps: FollowUpItem[] };
      })
      .then((d) => d && setItems(d.followUps))
      .catch(() => setItems([]));
  }, []);

  if (signedOut) return null;

  if (items === null) {
    return (
      <Card material="paper" framed className="shadow-bevel-sm">
        <h2 className="font-display text-base font-bold text-engraved">
          ⏰ Follow-ups
        </h2>
        <p className="mt-1 text-xs opacity-60">Checking…</p>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card material="paper" framed className="shadow-bevel-sm">
        <h2 className="font-display text-base font-bold text-engraved">
          ⏰ Follow-ups
        </h2>
        <p className="mt-1 text-xs opacity-70">
          Nothing overdue — applications are moving or recent. Nice.
        </p>
      </Card>
    );
  }

  return (
    <Card material="paper" framed className="shadow-bevel-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-blood-dark">
          ⏰ Needs follow-up
        </h2>
        <span className="rounded-full border border-blood-dark/40 bg-blood-light/30 px-2 py-0.5 text-[11px] font-bold text-blood-dark">
          {items.length} overdue
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blood-dark/30 bg-blood-light/20 px-3 py-2 shadow-engraved"
          >
            <div className="min-w-0">
              <Link
                href={`/applications/${it._id}`}
                className="text-sm font-bold text-ink underline-offset-2 hover:text-brass-dark hover:underline"
              >
                {it.title}
              </Link>
              {it.companyName && (
                <span className="ml-1.5 text-xs font-semibold text-ink-soft">
                  at {it.companyName}
                </span>
              )}
              <p className="mt-0.5 text-[11px] uppercase tracking-wide opacity-60">
                {it.status} · applied{" "}
                {new Date(it.dateApplied).toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full border border-blood-dark/50 bg-blood/10 px-2 py-0.5 text-[11px] font-bold text-blood-dark">
              {it.days}d stale
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}