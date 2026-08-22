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
 * date, rendered as a leather calendar-strip of paper cards (#16).
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
      <h2 className="font-display text-lg font-bold text-engraved">
        🎯 Upcoming interviews & screenings
      </h2>
      <div className="mt-3">
        {loading ? (
          <Card className="text-sm opacity-70">Loading upcoming events…</Card>
        ) : error ? (
          <Card className="text-sm text-blood-dark">⚠️ {error}</Card>
        ) : events.length === 0 ? (
          <Card material="paper" framed className="shadow-bevel-sm">
            <p className="text-sm italic opacity-60">
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
                    <Card material="paper" framed className="shadow-bevel transition hover:-translate-y-0.5 hover:shadow-bevel-lg">
                      <div className="flex items-start gap-3">
                        {/* date tab */}
                        <span className="flex w-14 shrink-0 flex-col items-center rounded-md border border-brass-dark/50 bg-gradient-to-b from-brass-light to-brass px-2 py-1.5 shadow-bevel-sm">
                          <span className="font-display text-xl font-bold leading-none text-ink">{d.day}</span>
                          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/70">{d.month}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-tight">{ev.application.title}</p>
                          <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                            {ev.application.companyName || "No company"}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] opacity-75">
                            <Badge tone={meta.tone} dot className="!px-1.5 !text-[10px]">
                              {meta.label}
                            </Badge>
                            <span>{d.weekday} · {d.time}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-moss-dark">
                            {daysAway(ev.occurredAt)} · {d.full}
                          </p>
                          {ev.note && (
                            <p className="mt-1 line-clamp-2 text-[11px] italic opacity-60">{ev.note}</p>
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