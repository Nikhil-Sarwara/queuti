"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";

interface UpcomingEvent {
  _id: string;
  type: string;
  occurredAt: string;
  note: string;
  application: {
    _id: string;
    title: string;
    companyName: string;
    status: string;
    applyUrl: string;
  };
}

const EVENT_META: Record<string, { label: string; tone: "interview" | "screening" }> = {
  interview: { label: "Interview", tone: "interview" },
  screening: { label: "Screening", tone: "screening" },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-AU", { day: "numeric" }),
    month: d.toLocaleDateString("en-AU", { month: "short" }),
    weekday: d.toLocaleDateString("en-AU", { weekday: "long" }),
    time: d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

function daysAway(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/**
 * Upcoming interviews & screenings — events in the next 14 days, sorted by
 * date, rendered as a card grid.
 */
export function UpcomingInterviews() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { events: UpcomingEvent[] };
      })
      .then((d) => setEvents(d.events))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load upcoming events")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-text-primary">
        Upcoming interviews & screenings
      </h2>
      <div className="mt-3">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading upcoming events">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-border-subtle bg-elevated" />
            ))}
          </div>
        ) : error ? (
          <Card className="text-sm text-error" role="alert">{error}</Card>
        ) : events.length === 0 ? (
          <Card>
            <p className="text-sm italic text-text-tertiary">
              Nothing booked in the next 14 days — add interview or screening
              events from an application&apos;s detail page to see them here.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {events.map((ev) => {
              const meta = EVENT_META[ev.type] || { label: ev.type, tone: "interview" as const };
              const d = fmtDate(ev.occurredAt);
              return (
                <li key={ev._id}>
                  <Link href={`/applications/${ev.application._id}`} className="block">
                    <Card className="transition-all duration-150 hover:-translate-y-0.5 hover:shadow-2">
                      <div className="flex items-start gap-3">
                        {/* date tab */}
                        <span className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-border-subtle bg-elevated px-2 py-1.5">
                          <span className="text-xl font-bold leading-none text-text-primary">{d.day}</span>
                          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary">{d.month}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-tight text-text-primary">{ev.application.title}</p>
                          <p className="mt-0.5 text-xs font-semibold text-text-secondary">
                            {ev.application.companyName || "No company"}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
                            <Badge tone={meta.tone} dot className="!px-1.5 !text-[10px]">
                              {meta.label}
                            </Badge>
                            <span>{d.weekday} · {d.time}</span>
                          </p>
                          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-success">
                            {daysAway(ev.occurredAt)} · {d.full}
                          </p>
                          {ev.note && (
                            <p className="mt-1 line-clamp-2 text-xs italic text-text-tertiary">{ev.note}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
