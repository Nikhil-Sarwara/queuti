"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UpcomingEvent {
  _id: string;
  type: string;
  occurredAt: string;
  note: string;
  application: {
    _id: string;
    title: string;
    companyName: string;
  };
}

const EVENT_EMOJI: Record<string, string> = {
  interview: "🎤",
  screening: "📞",
};

function daysAway(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days}d`;
}

/**
 * Compact upcoming interviews widget embedded in the sidebar.
 * Fetches from /api/events and renders a minimal list.
 */
export function SidebarUpcoming() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        return (await res.json()) as { events: UpcomingEvent[] };
      })
      .then((d) => setEvents(d.events))
      .catch(() => {
        /* silent — sidebar widget is non-critical */
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-elevated" />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="px-3 py-2">
      <Link
        href="/dashboard/interviews"
        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-tertiary hover:text-text-secondary"
      >
        Upcoming
      </Link>
      <ul className="space-y-1">
        {events.slice(0, 5).map((ev) => {
          const d = new Date(ev.occurredAt);
          const dayLabel = d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
          return (
            <li key={ev._id}>
              <Link
                href={`/applications/${ev.application._id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-elevated"
              >
                <span className="shrink-0 text-sm">
                  {EVENT_EMOJI[ev.type] || "📅"}
                </span>
                <span className="min-w-0 flex-1 truncate text-text-primary">
                  {ev.application.title}
                </span>
                <span className="shrink-0 text-[10px] font-medium text-success">
                  {daysAway(ev.occurredAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
