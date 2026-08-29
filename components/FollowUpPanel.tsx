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
 * 'Needs follow-up' ledger strip: applications sitting without a
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
      <Card>
        <h2 className="text-base font-bold text-text-primary">
          Follow-ups
        </h2>
        <p className="mt-1 text-xs text-text-tertiary">Checking…</p>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <h2 className="text-base font-bold text-text-primary">
          Follow-ups
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Nothing overdue — applications are moving or recent. Nice.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-error">
          Needs follow-up
        </h2>
        <span className="rounded-full border border-error/30 bg-error/10 px-2 py-0.5 text-xs font-bold text-error">
          {items.length} overdue
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-elevated p-3"
          >
            <div className="min-w-0">
              <Link
                href={`/applications/${it._id}`}
                className="text-sm font-bold text-text-primary underline-offset-2 hover:text-accent hover:underline"
              >
                {it.title}
              </Link>
              {it.companyName && (
                <span className="ml-1.5 text-xs font-semibold text-text-secondary">
                  at {it.companyName}
                </span>
              )}
              <p className="mt-0.5 text-xs text-text-tertiary">
                {it.status} · applied{" "}
                {new Date(it.dateApplied).toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full border border-error/30 bg-error/10 px-2 py-0.5 text-xs font-bold text-error">
              {it.days}d stale
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
