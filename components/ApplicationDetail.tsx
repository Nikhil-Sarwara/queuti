"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, TextField } from "@/components/ui";
import { RoleFitScore } from "@/components/RoleFitScore";
import { toast } from "@/lib/toast";

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

interface PrepQuestion {
  text: string;
  done: boolean;
}

interface DetailEvent {
  _id: string;
  type: string;
  occurredAt: string;
  note: string;
  questions?: PrepQuestion[];
  prepNote?: string;
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
const MANUAL_TYPES = ["follow_up", "note", "interview", "screening"];
const PREP_TYPES = ["interview", "screening"];
const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30";

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

/** Application detail page: status stepper, stage timeline, notes, linked company/contacts. */
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

  const [evType, setEvType] = useState("follow_up");
  const [evDate, setEvDate] = useState(new Date().toISOString().slice(0, 10));
  const [evNote, setEvNote] = useState("");
  const [evQuestions, setEvQuestions] = useState("");
  const [evPrepNote, setEvPrepNote] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  const [prepDrafts, setPrepDrafts] = useState<
    Record<string, { newQ: string; note: string; dirty: boolean; open: boolean }>
  >({});
  const [prepBusy, setPrepBusy] = useState<Record<string, boolean>>({});

  function setDraft(
    evId: string,
    patch: Partial<{ newQ: string; note: string; dirty: boolean; open: boolean }>
  ) {
    setPrepDrafts((prev) => {
      const cur = prev[evId] ?? { newQ: "", note: "", dirty: false, open: false };
      return { ...prev, [evId]: { ...cur, ...patch } };
    });
  }

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
    return <Card className="text-sm text-text-secondary">Loading application details…</Card>;
  }
  if (!app) {
    return (
      <Card className="border-error/20">
        <p className="text-sm font-semibold text-error">{error || "Application not found."}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => router.push("/dashboard")}>
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
      toast(`Moved to ${next}`, "success");
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
      toast("Saved notes & job description", "success");
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
      const questions = evQuestions
        .split(/\n+/)
        .map((q) => q.trim())
        .filter(Boolean)
        .map((text) => ({ text, done: false }));
      await api(`/api/applications/${id}/events`, {
        method: "POST",
        body: JSON.stringify({
          type: evType,
          occurredAt: new Date(evDate).toISOString(),
          note: evNote,
          questions: questions.length ? questions : undefined,
          prepNote: evPrepNote.trim() || undefined,
        }),
      });
      setEvNote("");
      setEvQuestions("");
      setEvPrepNote("");
      setEvDate(new Date().toISOString().slice(0, 10));
      await load();
      setPrepDrafts({});
      toast("Event added to timeline", "success");
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
      setPrepDrafts({});
      toast("Timeline entry deleted", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  async function patchPrep(
    ev: DetailEvent,
    patch: { questions?: PrepQuestion[]; prepNote?: string }
  ) {
    const body: Record<string, unknown> = {};
    if (patch.questions !== undefined) body.questions = patch.questions;
    if (patch.prepNote !== undefined) body.prepNote = patch.prepNote;
    setPrepBusy((b) => ({ ...b, [ev._id]: true }));
    setError("");
    try {
      const { event } = await api<{ event: DetailEvent }>(
        `/api/applications/${id}/events/${ev._id}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      setEvents((evs) => evs.map((e) => (e._id === ev._id ? event : e)));
      if (patch.prepNote !== undefined) {
        setDraft(ev._id, { note: patch.prepNote, dirty: false });
      }
      toast("Prep saved", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prep");
    } finally {
      setPrepBusy((b) => ({ ...b, [ev._id]: false }));
    }
  }

  async function toggleQuestion(ev: DetailEvent, idx: number) {
    const qs = (ev.questions || []).map((q, i) =>
      i === idx ? { ...q, done: !q.done } : q
    );
    await patchPrep(ev, { questions: qs });
  }

  async function addQuestion(ev: DetailEvent) {
    const draft = prepDrafts[ev._id];
    const text = (draft?.newQ ?? "").trim();
    if (!text) return;
    const qs = [...(ev.questions || []), { text, done: false }];
    await patchPrep(ev, { questions: qs });
    setDraft(ev._id, { newQ: "" });
  }

  async function removeQuestion(ev: DetailEvent, idx: number) {
    if (!confirm("Remove this planned question?")) return;
    const qs = (ev.questions || []).filter((_, i) => i !== idx);
    await patchPrep(ev, { questions: qs });
  }

  async function savePrepNote(ev: DetailEvent) {
    const draft = prepDrafts[ev._id];
    await patchPrep(ev, {
      prepNote: (draft?.note ?? ev.prepNote ?? "").trim(),
    });
  }

  async function removeApp() {
    const current = app;
    if (!current) return;
    if (!confirm(`Archive "${current.title}"${current.companyName ? ` at ${current.companyName}` : ""}? You can restore it later from the Archived view.`)) return;
    setDeleting(true);
    try {
      await api(`/api/applications/${id}`, { method: "DELETE" });
      toast("Application archived", "success");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Card className="border-error/20" role="alert">
          <p className="text-sm font-semibold text-error">{error}</p>
        </Card>
      )}

      {/* ---- identity + status ---- */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {app.title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {app.companyName || "No company"} · applied {fmtDate(app.dateApplied)}
              {app.source && <> · <span className="uppercase">{app.source}</span></>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge tone={app.status} dot>{app.status}</Badge>
              {app.salary && <Badge tone="neutral">{app.salary}</Badge>}
              {app.applyUrl && (
                <a href={app.applyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:text-text-primary">
                  view posting ↗
                </a>
              )}
              {app.hiringEmail && (
                <a href={`mailto:${app.hiringEmail}`} className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:text-text-primary">
                  {app.hiringEmail}
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
            <Button size="sm" variant="secondary" disabled={statusIdx === 0 || busyStatus} onClick={() => move(-1)} title="Move earlier stage" aria-label="Move application to previous stage">←</Button>
            <span className="rounded-lg border border-border-subtle bg-elevated px-3 py-1.5 text-xs font-bold text-text-secondary">
              {statusIdx + 1}/{STATUSES.length}
            </span>
            <Button size="sm" variant="secondary" disabled={statusIdx === STATUSES.length - 1 || busyStatus} onClick={() => move(1)} title="Move later stage" aria-label="Move application to next stage">→</Button>
            <Button size="sm" variant="danger" disabled={deleting} onClick={removeApp} title="Archive application" aria-label="Archive application">🗑</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ---- timeline ---- */}
        <Card>
          <h3 className="text-base font-bold text-text-primary">
            Stage history
          </h3>
          <ol className="mt-3 max-h-[400px] space-y-0 overflow-y-auto scrollbar-thin">
            {events.length === 0 && (
              <li className="py-2 text-sm italic text-text-tertiary">No events recorded yet.</li>
            )}
            {events.map((ev, idx) => {
              const meta = EVENT_META[ev.type] || { label: ev.type, tone: "neutral" as const };
              const isPrep =
                PREP_TYPES.includes(ev.type) ||
                (ev.questions?.length ?? 0) > 0 ||
                !!ev.prepNote;
              const qs = ev.questions || [];
              const doneCount = qs.filter((q) => q.done).length;
              const draft = prepDrafts[ev._id];
              const open = draft?.open ?? isPrep;
              const busy = prepBusy[ev._id] ?? false;
              return (
                <li key={ev._id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* vertical line */}
                  {idx < events.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                  )}
                  {/* dot */}
                  <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-elevated p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Badge tone={meta.tone} className="shrink-0 !px-2 !text-[10px]">{meta.label}</Badge>
                        <p className="mt-1 text-xs font-semibold text-text-tertiary">{fmtDateTime(ev.occurredAt)}</p>
                        {ev.note && <p className="mt-1 text-sm text-text-primary">{ev.note}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {isPrep && (
                          <Button size="sm" variant="ghost" title={open ? "Hide interview prep" : "Interview prep"} aria-label={open ? "Hide interview prep" : "Show interview prep"} aria-expanded={open} onClick={() => setDraft(ev._id, { open: !open })}>
                            🎯
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="Delete event" aria-label="Delete timeline event" onClick={() => removeEvent(ev)}>✕</Button>
                      </div>
                    </div>

                    {isPrep && open && (
                      <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Prep checklist</p>
                          <p className="text-[10px] font-semibold text-text-tertiary">{doneCount}/{qs.length} prepared</p>
                        </div>
                        {qs.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {qs.map((q, qi) => (
                              <li key={qi} className="flex items-center gap-1.5 text-sm">
                                <input
                                  type="checkbox"
                                  checked={q.done}
                                  disabled={busy}
                                  onChange={() => toggleQuestion(ev, qi)}
                                  className="h-3.5 w-3.5 accent-accent"
                                  title={q.done ? "Mark not prepared" : "Mark prepared"}
                                />
                                <span className={`flex-1 ${q.done ? "text-text-tertiary line-through" : "text-text-primary"}`}>{q.text}</span>
                                <button
                                  type="button"
                                  title="Remove question"
                                  aria-label="Remove question"
                                  disabled={busy}
                                  onClick={() => removeQuestion(ev, qi)}
                                  className="text-text-tertiary opacity-50 transition-all duration-150 hover:text-error hover:opacity-100 disabled:opacity-25"
                                >✕</button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
                            placeholder="Planned question…"
                            value={draft?.newQ ?? ""}
                            disabled={busy}
                            onChange={(e) => setDraft(ev._id, { newQ: e.target.value })}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(ev); } }}
                          />
                          <Button size="sm" variant="primary" disabled={busy} onClick={() => addQuestion(ev)}>+</Button>
                        </div>
                        <div className="mt-2">
                          <textarea
                            rows={2}
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-accent"
                            placeholder="Prep notes — talking points, likely questions, answers…"
                            value={draft?.note ?? ev.prepNote ?? ""}
                            disabled={busy}
                            onChange={(e) => setDraft(ev._id, { note: e.target.value, dirty: true })}
                          />
                          <div className="mt-1 flex justify-end">
                            <Button size="sm" variant="secondary" disabled={busy || !draft?.dirty} onClick={() => savePrepNote(ev)}>
                              {busy ? "Saving…" : "Save prep notes"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <form onSubmit={addEvent} className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Add event</p>
            <div className="grid grid-cols-2 gap-2">
              <select className={inputCls} aria-label="Event type" value={evType} onChange={(e) => setEvType(e.target.value)}>
                {MANUAL_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_META[t].label}</option>
                ))}
              </select>
              <input type="date" aria-label="Event date" className={inputCls} value={evDate} onChange={(e) => setEvDate(e.target.value)} />
            </div>
            <input
              className={inputCls}
              placeholder="e.g. Sent follow-up email…"
              aria-label="Event note"
              value={evNote}
              onChange={(e) => setEvNote(e.target.value)}
            />
            {PREP_TYPES.includes(evType) && (
              <>
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="Planned questions (one per line)"
                  aria-label="Planned interview questions"
                  value={evQuestions}
                  onChange={(e) => setEvQuestions(e.target.value)}
                />
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="Prep notes — talking points, answers…"
                  aria-label="Prep notes"
                  value={evPrepNote}
                  onChange={(e) => setEvPrepNote(e.target.value)}
                />
              </>
            )}
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={addingEvent}>
                {addingEvent ? "Adding…" : "Add to timeline"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          {/* ---- notes + job description ---- */}
          <Card>
            <h3 className="text-base font-bold text-text-primary">
              Notes & Job description
            </h3>
            <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview prep, follow-up plan, salary expectations…"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Job description <span className="normal-case font-normal text-text-tertiary">(paste it — the browser ML scores your role fit)</span>
            </label>
            <textarea
              rows={6}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here…"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {jd.trim() && <RoleFitScore jd={jd} />}
              <Button type="button" variant="primary" size="sm" onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? "Saving…" : "Save notes & JD"}
              </Button>
            </div>
          </Card>

          {/* ---- linked company / contacts ---- */}
          <Card>
            <h3 className="text-base font-bold text-text-primary">
              Linked company & contacts
            </h3>
            {linkedCompany ? (
              <div className="mt-2 rounded-lg border border-border-subtle bg-elevated p-3">
                <p className="text-sm font-bold text-text-primary">{linkedCompany.name}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-tertiary">
                  {linkedCompany.industry && <span>{linkedCompany.industry}</span>}
                  {linkedCompany.location && <span>{linkedCompany.location}</span>}
                  {linkedCompany.website && (
                    <a href={linkedCompany.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:text-text-primary">site ↗</a>
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs italic text-text-tertiary">
                No company record matches {app.companyName ? `"${app.companyName}"` : "this application"} — add one on the dashboard.
              </p>
            )}
            <div className="mt-3 space-y-2">
              {companyContacts.length === 0 && (
                <p className="text-xs italic text-text-tertiary">No contacts linked to this company yet.</p>
              )}
              {companyContacts.map((c) => (
                <div key={c._id} className="rounded-lg border border-border-subtle bg-elevated p-3">
                  <p className="text-sm font-bold text-text-primary">{c.name}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {c.email && <a href={`mailto:${c.email}`} className="font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:text-text-primary">{c.email}</a>}
                    {c.email && c.phone && " · "}
                    {c.phone && <span>{c.phone}</span>}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <p className="text-center text-xs text-text-tertiary">Updated {fmtDateTime(app.updatedAt)}</p>
    </div>
  );
}
