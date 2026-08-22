"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, TextField } from "@/components/ui";
import { RoleFitScore } from "@/components/RoleFitScore";

export type DetailStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

interface DetailApp {
  _id: string;
  title: string;
  companyName: string;
  applyUrl: string;
  hiringEmail: string;
  source: string;
  status: DetailStatus;
  dateApplied: string;
  salary: string;
  notes: string;
  jd: string;
  createdAt: string;
  updatedAt: string;
}

interface DetailEvent {
  _id: string;
  type: string;
  occurredAt: string;
  note: string;
}

interface Company {
  _id: string;
  name: string;
  website: string;
  industry: string;
  location: string;
}

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyId: string;
  notes: string;
}

const STATUSES: DetailStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

const EVENT_META: Record<string, { label: string; tone: "applied" | "screening" | "interview" | "offer" | "rejected" | "ghosted" | "neutral" }> = {
  applied: { label: "Applied", tone: "applied" },
  screening: { label: "Screening", tone: "screening" },
  interview: { label: "Interview", tone: "interview" },
  offer: { label: "Offer", tone: "offer" },
  rejected: { label: "Rejected", tone: "rejected" },
  ghosted: { label: "Ghosted", tone: "ghosted" },
  follow_up: { label: "Follow-up", tone: "neutral" },
  note: { label: "Note", tone: "neutral" },
};
const MANUAL_TYPES = ["follow_up", "note"];
const inputCls =
  "w-full rounded-md border border-ink/30 bg-ink/10 px-2.5 py-1.5 text-sm text-ink shadow-engraved outline-none transition placeholder:text-ink-faint focus:border-brass focus:bg-paper-light/60 focus:ring-2 focus:ring-brass/30";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Application detail page: status stepper, stage timeline, notes, linked company/contacts (#15). */
export function ApplicationDetail({ id }: { id: string; sessionEmail: string }) {
  const router = useRouter();
  const [app, setApp] = useState<DetailApp | null>(null);
  const [events, setEvents] = useState<DetailEvent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notes, setNotes] = useState("");
  const [jd, setJd] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // manual event form
  const [evType, setEvType] = useState("follow_up");
  const [evDate, setEvDate] = useState(new Date().toISOString().slice(0, 10));
  const [evNote, setEvNote] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, ev, co, ct] = await Promise.all([
        api<{ application: DetailApp }>(`/api/applications/${id}`),
        api<{ events: DetailEvent[] }>(`/api/applications/${id}/events`),
        api<{ companies: Company[] }>("/api/companies"),
        api<{ contacts: Contact[] }>("/api/contacts"),
      ]);
      setApp(a.application);
      setNotes(a.application.notes || "");
      setJd(a.application.jd || "");
      setEvents(ev.events);
      setCompanies(co.companies);
      setContacts(ct.contacts);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load application");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <Card className="text-sm opacity-70">Loading application details…</Card>;
  }
  if (!app) {
    return (
      <Card className="border-blood/60 shadow-bevel-sm">
        <p className="text-sm font-semibold text-blood">⚠️ {error || "Application not found."}</p>
        <Button variant="paper" size="sm" className="mt-3" onClick={() => router.push("/dashboard")}>
          ← Back to dashboard
        </Button>
      </Card>
    );
  }

  const linkedCompany = app.companyName
    ? companies.find((c) => c.name.toLowerCase() === app.companyName.toLowerCase())
    : undefined;
  const companyContacts = linkedCompany
    ? contacts.filter((c) => c.companyId === linkedCompany._id)
    : [];
  const statusIdx = STATUSES.indexOf(app.status);

  async function move(dir: -1 | 1) {
    const next = STATUSES[statusIdx + dir];
    if (!next || busyStatus) return;
    setBusyStatus(true);
    setError("");
    try {
      const { application } = await api<{ application: DetailApp }>(
        `/api/applications/${id}`,
        { method: "PATCH", body: JSON.stringify({ status: next }) }
      );
      setApp(application);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to move");
    } finally {
      setBusyStatus(false);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setError("");
    try {
      const { application } = await api<{ application: DetailApp }>(
        `/api/applications/${id}`,
        { method: "PATCH", body: JSON.stringify({ notes, jd }) }
      );
      setApp(application);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!evNote.trim() && evType === "note") return;
    setAddingEvent(true);
    setError("");
    try {
      await api(`/api/applications/${id}/events`, {
        method: "POST",
        body: JSON.stringify({
          type: evType,
          occurredAt: new Date(evDate).toISOString(),
          note: evNote,
        }),
      });
      setEvNote("");
      setEvDate(new Date().toISOString().slice(0, 10));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event");
    } finally {
      setAddingEvent(false);
    }
  }

  async function removeEvent(ev: DetailEvent) {
    if (!confirm("Delete this timeline entry?")) return;
    setError("");
    try {
      await api(`/api/applications/${id}/events/${ev._id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  async function removeApp() {
    const current = app;
    if (!current) return;
    if (!confirm(`Delete application "${current.title}"${current.companyName ? ` at ${current.companyName}` : ""}?`)) return;
    setDeleting(true);
    try {
      await api(`/api/applications/${id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Card material="paper" className="border-blood/60 shadow-bevel-sm">
          <p className="text-sm font-semibold text-blood">⚠️ {error}</p>
        </Card>
      )}

      {/* ---- identity + status ---- */}
      <Card material="leather" framed className="shadow-bevel-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-paper-light text-embossed">
              {app.title}
            </h2>
            <p className="mt-1 text-sm text-paper-light/80">
              {app.companyName || "No company"} · applied {fmtDate(app.dateApplied)}
              {app.source && <> · <span className="uppercase">{app.source}</span></>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge tone={app.status} dot>{app.status}</Badge>
              {app.salary && <Badge tone="neutral">💰 {app.salary}</Badge>}
              {app.applyUrl && (
                <a href={app.applyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brass-light underline decoration-brass/40 underline-offset-2 hover:text-paper-light">
                  view posting ↗
                </a>
              )}
              {app.hiringEmail && (
                <a href={`mailto:${app.hiringEmail}`} className="font-semibold text-brass-light underline decoration-brass/40 underline-offset-2 hover:text-paper-light">
                  ✉️ {app.hiringEmail}
                </a>
              )}
            </div>
            {app.jd && (
              <p className="mt-2">
                <RoleFitScore jd={app.jd} />
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="paper" disabled={statusIdx === 0 || busyStatus} onClick={() => move(-1)} title="Move earlier stage">←</Button>
            <span className="rounded-md border border-paper-light/20 bg-paper-light/10 px-3 py-1.5 text-xs font-bold text-paper-light shadow-engraved">
              {statusIdx + 1}/{STATUSES.length}
            </span>
            <Button size="sm" variant="paper" disabled={statusIdx === STATUSES.length - 1 || busyStatus} onClick={() => move(1)} title="Move later stage">→</Button>
            <Button size="sm" variant="danger" disabled={deleting} onClick={removeApp} title="Delete application">✕</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ---- timeline ---- */}
        <Card material="paper" framed className="shadow-bevel">
          <h3 className="font-display text-base font-bold text-engraved">
            🕰️ Stage history
          </h3>
          <ol className="mt-3 space-y-2">
            {events.length === 0 && (
              <li className="text-sm italic opacity-60">No events recorded yet.</li>
            )}
            {events.map((ev) => {
              const meta = EVENT_META[ev.type] || { label: ev.type, tone: "neutral" as const };
              return (
                <li key={ev._id} className="flex items-start gap-2 rounded-md border border-ink/15 bg-paper-dark/40 p-2 shadow-engraved">
                  <Badge tone={meta.tone} className="shrink-0 !px-2 !text-[10px]">{meta.label}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold opacity-70">{fmtDateTime(ev.occurredAt)}</p>
                    {ev.note && <p className="mt-0.5 text-xs">{ev.note}</p>}
                  </div>
                  <Button size="sm" variant="danger" title="Delete event" onClick={() => removeEvent(ev)}>✕</Button>
                </li>
              );
            })}
          </ol>

          <form onSubmit={addEvent} className="mt-4 flex flex-col gap-2 border-t border-ink/15 pt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Add event</p>
            <div className="grid grid-cols-2 gap-2">
              <select className={inputCls} value={evType} onChange={(e) => setEvType(e.target.value)}>
                {MANUAL_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_META[t].label}</option>
                ))}
              </select>
              <input type="date" className={inputCls} value={evDate} onChange={(e) => setEvDate(e.target.value)} />
            </div>
            <input
              className={inputCls}
              placeholder="e.g. Sent follow-up email…"
              value={evNote}
              onChange={(e) => setEvNote(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="brass" size="sm" disabled={addingEvent}>
                {addingEvent ? "Adding…" : "➕ Add to timeline"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          {/* ---- notes + job description ---- */}
          <Card material="wood" framed className="shadow-bevel">
            <h3 className="font-display text-base font-bold text-ink text-engraved">
              📝 Notes & Job description
            </h3>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview prep, follow-up plan, salary expectations…"
              className="mt-1.5 w-full rounded-md border border-ink/30 bg-ink/10 px-3 py-2 text-sm text-ink shadow-engraved outline-none transition placeholder:text-ink-faint focus:border-brass focus:bg-paper-light/60 focus:ring-2 focus:ring-brass/30"
            />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Job description <span className="normal-case opacity-60">(paste it — the browser ML scores your role fit)</span>
            </label>
            <textarea
              rows={6}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here…"
              className="mt-1.5 w-full rounded-md border border-ink/30 bg-ink/10 px-3 py-2 text-sm text-ink shadow-engraved outline-none transition placeholder:text-ink-faint focus:border-brass focus:bg-paper-light/60 focus:ring-2 focus:ring-brass/30"
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {jd.trim() && <RoleFitScore jd={jd} />}
              <Button type="button" variant="brass" size="sm" onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? "Saving…" : "💾 Save notes & JD"}
              </Button>
            </div>
          </Card>

          {/* ---- linked company / contacts ---- */}
          <Card material="paper" framed className="shadow-bevel">
            <h3 className="font-display text-base font-bold text-engraved">
              🔗 Linked company & contacts
            </h3>
            {linkedCompany ? (
              <div className="mt-2 rounded-md border border-ink/15 bg-paper-dark/40 p-2.5 shadow-engraved">
                <p className="text-sm font-bold">{linkedCompany.name}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] opacity-70">
                  {linkedCompany.industry && <span>{linkedCompany.industry}</span>}
                  {linkedCompany.location && <span>📍 {linkedCompany.location}</span>}
                  {linkedCompany.website && (
                    <a href={linkedCompany.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-brass-dark underline decoration-brass/50 underline-offset-2 hover:text-ink">site ↗</a>
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs italic opacity-60">
                No company record matches {app.companyName ? `“${app.companyName}”` : "this application"} — add one on the dashboard.
              </p>
            )}
            <div className="mt-3 space-y-2">
              {companyContacts.length === 0 && (
                <p className="text-xs italic opacity-60">No contacts linked to this company yet.</p>
              )}
              {companyContacts.map((c) => (
                <div key={c._id} className="rounded-md border border-ink/15 bg-paper-dark/40 p-2.5 shadow-engraved">
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="mt-0.5 text-[11px] opacity-70">
                    {c.email && <a href={`mailto:${c.email}`} className="font-semibold text-brass-dark underline decoration-brass/50 underline-offset-2 hover:text-ink">{c.email}</a>}
                    {c.email && c.phone && " · "}
                    {c.phone && <span>📞 {c.phone}</span>}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <p className="text-center text-xs opacity-50">Updated {fmtDateTime(app.updatedAt)}</p>
    </div>
  );
}