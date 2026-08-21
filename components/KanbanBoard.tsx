"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, TextField } from "@/components/ui";

export type AppStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

export interface KanbanApp {
  _id: string;
  title: string;
  companyName: string;
  applyUrl: string;
  hiringEmail: string;
  source: string;
  status: AppStatus;
  dateApplied: string;
  salary: string;
  notes: string;
}

const STATUSES: AppStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

const COLUMN_META: Record<AppStatus, { label: string; cls: string }> = {
  applied: { label: "Applied", cls: "from-brass-light to-brass text-ink" },
  screening: { label: "Screening", cls: "from-leather-300 to-leather-500 text-paper-light" },
  interview: { label: "Interview", cls: "from-moss-light to-moss text-paper-light" },
  offer: { label: "Offer", cls: "from-moss to-moss-light text-ink" },
  rejected: { label: "Rejected", cls: "from-blood-light to-blood text-paper-light" },
  ghosted: { label: "Ghosted", cls: "from-ink/50 to-ink/70 text-paper-light" },
};

const EMPTY_FORM = {
  title: "",
  companyName: "",
  applyUrl: "",
  hiringEmail: "",
  source: "",
  salary: "",
  notes: "",
  status: "applied" as AppStatus,
  dateApplied: new Date().toISOString().slice(0, 10),
};

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

export function KanbanBoard() {
  const [apps, setApps] = useState<KanbanApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ applications: KanbanApp[] }>("/api/applications");
      setApps(data.applications);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function createApp(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { application } = await api<{ application: KanbanApp }>(
        "/api/applications",
        {
          method: "POST",
          body: JSON.stringify({ ...form, dateApplied: new Date(form.dateApplied).toISOString() }),
        }
      );
      setApps((prev) => [application, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  async function move(app: KanbanApp, dir: -1 | 1) {
    const i = STATUSES.indexOf(app.status);
    const next = STATUSES[i + dir];
    if (!next) return;
    setBusyId(app._id);
    setError("");
    try {
      const { application } = await api<{ application: KanbanApp }>(
        `/api/applications/${app._id}`,
        { method: "PATCH", body: JSON.stringify({ status: next }) }
      );
      setApps((prev) => prev.map((a) => (a._id === app._id ? application : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move");
    } finally {
      setBusyId("");
    }
  }

  async function remove(app: KanbanApp) {
    if (!confirm(`Delete "${app.title}"${app.companyName ? ` at ${app.companyName}` : ""}?`)) return;
    setBusyId(app._id);
    setError("");
    try {
      await api(`/api/applications/${app._id}`, { method: "DELETE" });
      setApps((prev) => prev.filter((a) => a._id !== app._id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId("");
    }
  }

  async function importCsv() {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportResult("");
    setError("");
    try {
      const res = await fetch("/api/applications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
      setImportResult(
        `✅ Imported ${data.imported}, skipped ${data.skipped} duplicate${data.invalid ? ", " + data.invalid + " invalid" : ""}.`
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import");
    } finally {
      setImporting(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(file);
  }

  const byStatus = (s: AppStatus) => apps.filter((a) => a.status === s);

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Add application (brass ledger card) ---- */}
      <Card material="leather" framed className="shadow-bevel-lg">
        <h2 className="font-display text-lg font-bold text-paper-light text-embossed">
          ✒️ New Application
        </h2>
        <form onSubmit={createApp} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <TextField label="Job title *" name="title" required value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="Senior Engineer" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <TextField label="Company" name="companyName" value={form.companyName} onChange={(e) => set("companyName")(e.target.value)} placeholder="Acme Corp" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <TextField label="Source" name="source" value={form.source} onChange={(e) => set("source")(e.target.value)} placeholder="linkedin / seek / direct" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <TextField label="Date applied" name="dateApplied" type="date" value={form.dateApplied} onChange={(e) => set("dateApplied")(e.target.value)} />
          </div>
          <div className="col-span-2 md:col-span-2">
            <TextField label="Apply URL" name="applyUrl" value={form.applyUrl} onChange={(e) => set("applyUrl")(e.target.value)} placeholder="https://…" />
          </div>
          <div className="col-span-2 md:col-span-2">
            <TextField label="Hiring email" name="hiringEmail" type="email" value={form.hiringEmail} onChange={(e) => set("hiringEmail")(e.target.value)} placeholder="recruiter@acme.com" />
          </div>
          <div className="col-span-2">
            <TextField label="Notes" name="notes" value={form.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Cover letter sent, referral…" />
          </div>
          <div className="col-span-2 flex items-end justify-end">
            <Button type="submit" variant="brass" size="lg" disabled={submitting || !form.title.trim()}>
              {submitting ? "Saving…" : "➕ Add Application"}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <Card material="paper" className="border-blood/60 shadow-bevel-sm">
          <p className="text-sm font-semibold text-blood">⚠️ {error}</p>
        </Card>
      )}

      {/* ---- CSV import (desk drawer) ---- */}
      <Card material="wood" framed className="shadow-bevel">
        <details>
          <summary className="cursor-pointer select-none font-display text-base font-bold text-ink text-engraved">
            📥 Import from CSV (jobhunt-applications.csv)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex cursor-pointer flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Choose file
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-2 file:border-b-4 file:border-brass-dark/60 file:bg-gradient-to-b file:from-brass-light file:to-brass file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-ink file:shadow-bevel-sm file:transition hover:file:brightness-105"
              />
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              placeholder={"…or paste CSV here:\ndate,title,company,apply_url,hiring_email\n2026-08-16,Software Engineer,Acme,https://acme.com/job,hr@acme.com"}
              className="w-full rounded-md border border-ink/30 bg-ink/10 px-3 py-2 font-mono text-xs text-ink shadow-engraved outline-none transition placeholder:text-ink-faint focus:border-brass focus:bg-paper-light/60 focus:ring-2 focus:ring-brass/30"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="brass" onClick={importCsv} disabled={importing || !csvText.trim()}>
                {importing ? "Importing…" : "🚚 Import applications"}
              </Button>
              {importResult && <p className="text-sm font-semibold text-moss-dark">{importResult}</p>}
            </div>
          </div>
        </details>
      </Card>

      {loading ? (
        <Card material="paper" className="shadow-bevel-sm">
          <p className="text-sm opacity-70">Loading your applications…</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STATUSES.map((s) => (
            <div key={s} className="flex flex-col gap-2">
              <div className={`rounded-md border border-ink/20 bg-gradient-to-b px-3 py-1.5 text-center text-xs font-bold uppercase tracking-widest shadow-bevel-sm ${COLUMN_META[s].cls}`}>
                {COLUMN_META[s].label}
                <span className="ml-1.5 rounded-full bg-ink/15 px-1.5 text-[10px]">
                  {byStatus(s).length}
                </span>
              </div>
              <div className="flex min-h-[120px] flex-col gap-2 rounded-lg border-2 border-wood-dark/40 bg-wood-light/30 p-2 shadow-engraved">
                {byStatus(s).length === 0 && (
                  <p className="p-2 text-center text-[11px] italic text-ink-faint">
                    empty slot
                  </p>
                )}
                {byStatus(s).map((app) => (
                  <Card key={app._id} material="paper" className="!p-3 shadow-bevel-sm">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-bold leading-tight">{app.title}</p>
                      <Badge tone={app.status} dot className="shrink-0 !px-1.5 !text-[10px]" />
                    </div>
                    {app.companyName && (
                      <p className="mt-0.5 text-xs font-semibold text-ink-soft">{app.companyName}</p>
                    )}
                    <p className="mt-1 text-[11px] opacity-70">
                      🗓 {fmtDate(app.dateApplied)}
                      {app.source && <> · <span className="uppercase">{app.source}</span></>}
                    </p>
                    {app.salary && (
                      <p className="mt-0.5 text-[11px] font-semibold text-moss-dark">💰 {app.salary}</p>
                    )}
                    {app.notes && (
                      <p className="mt-1 line-clamp-2 text-[11px] italic opacity-70">{app.notes}</p>
                    )}
                    {app.applyUrl && (
                      <a
                        href={app.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-[11px] font-semibold text-brass-dark underline decoration-brass/50 underline-offset-2 hover:text-ink"
                      >
                        view posting ↗
                      </a>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="paper"
                          disabled={STATUSES.indexOf(app.status) === 0 || busyId === app._id}
                          onClick={() => move(app, -1)}
                          title="Move left"
                        >
                          ←
                        </Button>
                        <Button
                          size="sm"
                          variant="paper"
                          disabled={STATUSES.indexOf(app.status) === STATUSES.length - 1 || busyId === app._id}
                          onClick={() => move(app, 1)}
                          title="Move right"
                        >
                          →
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === app._id}
                        onClick={() => remove(app)}
                        title="Delete"
                      >
                        ✕
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}