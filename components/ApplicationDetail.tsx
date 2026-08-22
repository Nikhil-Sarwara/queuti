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
  const [evQuestions, setEvQuestions] = useState(""); // one per line
  const [evPrepNote, setEvPrepNote] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  // interview-prep state per event (#34)
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
      toast(`↩️ Moved to ${next}`, "success");
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
      toast("💾 Saved notes & job description", "success");
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
      toast("🕰️ Event added to timeline", "success");
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
      toast("🗑️ Timeline entry deleted", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  // ---- interview prep: question bank + notes per event (#34) ----

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
      toast("🎯 Prep saved", "success");
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
    if (!confirm(`Archive "${current.title}"${current.companyName ? ` at ${current.companyName}` : ""}? You can restore it later from the 🗃️ Archived view.`)) return;
    setDeleting(true);
    try {
      await api(`/api/applications/${id}`, { method: "DELETE" });
      toast("🗃️ Application archived", "success");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
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
            <Button size="sm" variant="danger" disabled={deleting} onClick={removeApp} title="Archive application (soft delete — restore from archived view)">🗃️</Button>
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
                <li key={ev._id} className="rounded-md border border-ink/15 bg-paper-dark/40 p-2 shadow-engraved">
                  <div className="flex items-start gap-2">
                    <Badge tone={meta.tone} className="shrink-0 !px-2 !text-[10px]">{meta.label}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold opacity-70">{fmtDateTime(ev.occurredAt)}</p>
                      {ev.note && <p className="mt-0.5 text-xs">{ev.note}</p>}
                    </div>
                    {isPrep && (
                      <Button size="sm" variant="paper" title={open ? "Hide interview prep" : "Interview prep"} onClick={() => setDraft(ev._id, { open: !open })}>
                        🎯
                      </Button>
                    )}
                    <Button size="sm" variant="danger" title="Delete event" onClick={() => removeEvent(ev)}>✕</Button>
                  </div>

                  {isPrep && open && (
                    <div className="mt-2 rounded-md border border-brass/25 bg-paper-light/40 p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brass-dark">🎯 Prep checklist</p>
                        <p className="text-[10px] font-semibold opacity-70">{doneCount}/{qs.length} prepared</p>
                      </div>
                      {qs.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {qs.map((q, qi) => (
                            <li key={qi} className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={q.done}
                                disabled={busy}
                                onChange={() => toggleQuestion(ev, qi)}
                                className="h-3.5 w-3.5 accent-brass"
                                title={q.done ? "Mark not prepared" : "Mark prepared"}
                              />
                              <span className={`flex-1 ${q.done ? "text-ink-faint line-through" : ""}`}>{q.text}</span>
                              <button
                                type="button"
                                title="Remove question"
                                disabled={busy}
                                onClick={() => removeQuestion(ev, qi)}
                                className="opacity-50 transition hover:text-blood hover:opacity-100 disabled:opacity-25"
                              >✕</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          className="min-w-0 flex-1 rounded-md border border-ink/25 bg-ink/10 px-2 py-1 text-xs shadow-engraved outline-none focus:border-brass"
                          placeholder="Planned question…"
                          value={draft?.newQ ?? ""}
                          disabled={busy}
                          onChange={(e) => setDraft(ev._id, { newQ: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQuestion(ev); } }}
                        />
                        <Button size="sm" variant="brass" disabled={busy} onClick={() => addQuestion(ev)}>＋</Button>
                      </div>
                      <div className="mt-2">
                        <textarea
                          rows={2}
                          className="w-full rounded-md border border-ink/25 bg-ink/10 px-2 py-1.5 text-xs shadow-engraved outline-none focus:border-brass"
                          placeholder="Prep notes — talking points, likely questions, answers…"
                          value={draft?.note ?? ev.prepNote ?? ""}
                          disabled={busy}
                          onChange={(e) => setDraft(ev._id, { note: e.target.value, dirty: true })}
                        />
                        <div className="mt-1 flex justify-end">
                          <Button size="sm" variant="paper" disabled={busy || !draft?.dirty} onClick={() => savePrepNote(ev)}>
                            {busy ? "Saving…" : "💾 Save prep notes"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
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
            {PREP_TYPES.includes(evType) && (
              <>
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="🎯 Planned questions (one per line)"
                  value={evQuestions}
                  onChange={(e) => setEvQuestions(e.target.value)}
                />
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="📝 Prep notes — talking points, answers…"
                  value={evPrepNote}
                  onChange={(e) => setEvPrepNote(e.target.value)}
                />
              </>
            )}
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