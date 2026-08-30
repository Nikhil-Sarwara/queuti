"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, TextField } from "@/components/ui";
import { ApplicationsTable } from "@/components/ApplicationsTable";
import { RoleFitScore } from "@/components/RoleFitScore";
import { toast } from "@/lib/toast";
import { STATUS_TONE_CLS } from "@/lib/tones";

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
  jd: string;
  archivedAt: string | null;
  updatedAt: string;
  needsFollowUp: boolean;
}

const STATUSES: AppStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

const COLUMN_META: Record<AppStatus, { label: string; cls: string; borderCls: string; bgCls: string }> = {
  applied:    { label: "Applied",    cls: STATUS_TONE_CLS.applied,    borderCls: "border-l-success",   bgCls: "bg-success/5" },
  screening:  { label: "Screening",  cls: STATUS_TONE_CLS.screening,  borderCls: "border-l-warning",   bgCls: "bg-warning/5" },
  interview:  { label: "Interview",  cls: STATUS_TONE_CLS.interview,  borderCls: "border-l-info",      bgCls: "bg-info/5" },
  offer:      { label: "Offer",      cls: STATUS_TONE_CLS.offer,      borderCls: "border-l-success",   bgCls: "bg-success/5" },
  rejected:   { label: "Rejected",   cls: STATUS_TONE_CLS.rejected,   borderCls: "border-l-error",     bgCls: "bg-error/5" },
  ghosted:    { label: "Ghosted",    cls: STATUS_TONE_CLS.ghosted,    borderCls: "border-l-text-secondary", bgCls: "bg-text-secondary/5" },
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

function loadCollapsed(): Set<AppStatus> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("queuti-collapsed-columns");
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveCollapsed(s: Set<AppStatus>) {
  try {
    localStorage.setItem("queuti-collapsed-columns", JSON.stringify(Array.from(s)));
  } catch { /* ignore */ }
}

function loadCompact(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("queuti-compact-mode") === "true";
  } catch { return false; }
}

function saveCompact(v: boolean) {
  try {
    localStorage.setItem("queuti-compact-mode", String(v));
  } catch { /* ignore */ }
}

/* ---------- column search hook ---------- */

function useColumnSearch() {
  const [searches, setSearches] = useState<Record<string, string>>({});
  const set = (status: AppStatus, v: string) =>
    setSearches((prev) => ({ ...prev, [status]: v }));
  const clear = (status: AppStatus) =>
    setSearches((prev) => ({ ...prev, [status]: "" }));
  const matches = (status: AppStatus, app: KanbanApp) => {
    const q = (searches[status] || "").trim().toLowerCase();
    if (!q) return true;
    return (
      app.title.toLowerCase().includes(q) ||
      app.companyName.toLowerCase().includes(q)
    );
  };
  return { searches, set, clear, matches };
}

/* ---------- main component ---------- */

export function KanbanBoard() {
  const [apps, setApps] = useState<KanbanApp[]>([]);
  const [view, setView] = useState<"board" | "table" | "archived">("board");
  const [archivedApps, setArchivedApps] = useState<KanbanApp[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [restoringId, setRestoringId] = useState("");
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<AppStatus>>(new Set());
  const [companyQ, setCompanyQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [boardSort, setBoardSort] = useState<"date-desc" | "updated-desc" | "updated-asc" | "followup">("date-desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importDupes, setImportDupes] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  // --- new state ---
  const [compact, setCompact] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<AppStatus>>(new Set());
  const [collapsedReady, setCollapsedReady] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const colSearch = useColumnSearch();
  const boardRef = useRef<HTMLDivElement>(null);

  // load persisted state
  useEffect(() => {
    setCollapsed(loadCollapsed());
    setCollapsedReady(true);
    setCompact(loadCompact());
  }, []);

  // persist collapsed
  useEffect(() => {
    if (collapsedReady) saveCollapsed(collapsed);
  }, [collapsed, collapsedReady]);

  // persist compact
  useEffect(() => {
    saveCompact(compact);
  }, [compact]);

  const toggleCompact = () => setCompact((c) => !c);

  const toggleCollapsed = (s: AppStatus) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const collapseAll = () => setCollapsed(new Set(STATUSES));
  const expandAll = () => setCollapsed(new Set());

  // data loading
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

  const loadArchived = useCallback(async () => {
    setArchivedLoading(true);
    try {
      const data = await api<{ applications: KanbanApp[] }>(
        "/api/applications?archived=1"
      );
      setArchivedApps(data.applications);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load archived applications");
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "archived") loadArchived();
  }, [view, loadArchived]);

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
      toast(`Added ${application.title}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  const moveToStatus = useCallback(async (app: KanbanApp, target: AppStatus) => {
    if (target === app.status) return;
    setBusyId(app._id);
    setError("");
    try {
      const { application } = await api<{ application: KanbanApp }>(
        `/api/applications/${app._id}`,
        { method: "PATCH", body: JSON.stringify({ status: target }) }
      );
      setApps((prev) => prev.map((a) => (a._id === app._id ? application : a)));
      toast(`Moved to ${COLUMN_META[target].label}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move");
    } finally {
      setBusyId("");
    }
  }, []);

  const move = useCallback(async (app: KanbanApp, dir: -1 | 1) => {
    const i = STATUSES.indexOf(app.status);
    const next = STATUSES[i + dir];
    if (!next) return;
    await moveToStatus(app, next);
  }, [moveToStatus]);

  async function restore(app: KanbanApp) {
    setRestoringId(app._id);
    setError("");
    try {
      await api(`/api/applications/${app._id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: false }),
      });
      setArchivedApps((prev) => prev.filter((a) => a._id !== app._id));
      toast(`Restored ${app.title}`, "success");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setRestoringId("");
    }
  }

  async function archive(app: KanbanApp) {
    if (!confirm(`Archive "${app.title}"${app.companyName ? ` at ${app.companyName}` : ""}?`)) return;
    setBusyId(app._id);
    setError("");
    try {
      await api(`/api/applications/${app._id}`, { method: "DELETE" });
      setApps((prev) => prev.filter((a) => a._id !== app._id));
      toast(`Archived ${app.title}`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
    } finally {
      setBusyId("");
    }
  }

  async function importCsvText(text: string) {
    if (!text.trim()) return;
    setImporting(true);
    setImportResult("");
    setImportErrors([]);
    setImportDupes([]);
    setError("");
    try {
      const res = await fetch("/api/applications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
      setImportResult(
        `Imported ${data.imported}, skipped ${data.skipped} exact duplicate${data.duplicates ? ", flagged " + data.duplicates + " duplicate" + (data.duplicates === 1 ? "" : "s") : ""}${data.invalid ? ", " + data.invalid + " invalid" : ""}.`
      );
      setImportErrors(data.errors || []);
      setImportDupes(data.duplicateMessages || []);
      toast(`Imported ${data.imported} application${data.imported === 1 ? "" : "s"} from CSV`, "success");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to import";
      setError(msg);
      toast(msg, "error");
    } finally {
      setImporting(false);
    }
  }

  async function importCsv() {
    await importCsvText(csvText);
  }

  function downloadTemplate() {
    const blob = new Blob(
      [
        "date,title,company,apply_url,hiring_email\n" +
          "2026-08-16,Software Engineer,Acme Corp,https://acme.com/jobs/123,hr@acme.com\n",
      ],
      { type: "text/csv" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "queuti-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setCsvText(text);
      importCsvText(text);
    };
    reader.readAsText(file);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(file);
  }

  const toggleStatus = (s: AppStatus) =>
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const filtersActive =
    hiddenStatuses.size > 0 || companyQ.trim() !== "" || dateFrom !== "" || dateTo !== "";

  const need = companyQ.trim().toLowerCase();
  const visible = useMemo(() => apps.filter((a) => {
    if (hiddenStatuses.has(a.status)) return false;
    if (need && !a.companyName.toLowerCase().includes(need)) return false;
    const day = a.dateApplied.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  }), [apps, hiddenStatuses, need, dateFrom, dateTo]);

  const visibleSorted = useMemo(() => {
    const arr = [...visible];
    if (boardSort === "date-desc") arr.sort((a, b) => b.dateApplied.localeCompare(a.dateApplied));
    else if (boardSort === "updated-desc") arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    else if (boardSort === "followup") {
      arr.sort((a, b) => {
        if (a.needsFollowUp !== b.needsFollowUp) return a.needsFollowUp ? -1 : 1;
        return a.dateApplied.localeCompare(b.dateApplied);
      });
    } else arr.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    return arr;
  }, [visible, boardSort]);

  const resetFilters = () => {
    setHiddenStatuses(new Set());
    setCompanyQ("");
    setDateFrom("");
    setDateTo("");
    setBoardSort("date-desc");
  };

  const byStatus = useCallback((s: AppStatus) =>
    visibleSorted.filter((a) => a.status === s && colSearch.matches(s, a)),
    [visibleSorted, colSearch]
  );

  const byStatusAll = useCallback((s: AppStatus) =>
    visibleSorted.filter((a) => a.status === s),
    [visibleSorted]
  );

  /* keyboard navigation */
  const handleCardKeyDown = useCallback((e: React.KeyboardEvent, app: KanbanApp) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(app, -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      move(app, 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      window.location.href = `/applications/${app._id}`;
    }
  }, [move]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // clear any active column search
        let cleared = false;
        for (const s of STATUSES) {
          if ((colSearch.searches[s] || "") !== "") {
            colSearch.clear(s);
            cleared = true;
          }
        }
        if (cleared) return;
        setFocusedCardId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [colSearch]);

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Add application ---- */}
      <Card>
        <h2 className="text-lg font-bold text-text-primary">
          New Application
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
            <Button type="submit" variant="primary" size="lg" disabled={submitting || !form.title.trim()}>
              {submitting ? "Saving…" : "Add Application"}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <Card className="border-error/20" role="alert">
          <p className="text-sm font-semibold text-error">{error}</p>
        </Card>
      )}

      {/* ---- CSV import & export ---- */}
      <Card>
        <details open={false}>
          <summary className="cursor-pointer select-none text-base font-bold text-text-primary">
            CSV import & export (jobhunt-applications.csv)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/api/applications/export"
                className="rounded-lg border border-success bg-success px-3 py-1.5 text-xs font-bold text-white transition-all duration-150 hover:bg-success/90 active:scale-[0.98]"
              >
                Export applications (CSV)
              </a>
              <Button type="button" variant="secondary" size="sm" onClick={downloadTemplate}>
                Download template CSV
              </Button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all duration-150 ${
                dragging
                  ? "border-accent bg-accent/10"
                  : "border-border-subtle bg-elevated hover:border-accent/50 hover:bg-accent/5"
              }`}
            >
              <label className="cursor-pointer text-sm font-semibold text-text-primary">
                {dragging ? "Drop it!" : "Drag & drop your CSV here"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFile}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-text-tertiary">or click to choose a file (date,title,company,apply_url,hiring_email) — exact duplicates are skipped, company+title duplicates are flagged</p>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              aria-label="Paste CSV data"
              placeholder={"…or paste CSV here:\ndate,title,company,apply_url,hiring_email\n2026-08-16,Software Engineer,Acme,https://acme.com/job,hr@acme.com"}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary" onClick={importCsv} disabled={importing || !csvText.trim()}>
                {importing ? "Importing…" : "Import pasted CSV"}
              </Button>
              {importResult && <p className="text-sm font-semibold text-success">{importResult}</p>}
            </div>
            {importErrors.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-error/40 bg-error/10 p-2.5 text-xs text-error" role="alert">
                {importErrors.map((msg, i) => (
                  <li key={i} className="font-mono">{msg}</li>
                ))}
              </ul>
            )}
            {importDupes.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-lg border border-accent/50 bg-accent/10 p-2.5 text-xs text-accent">
                {importDupes.map((msg, i) => (
                  <li key={i} className="font-mono">{msg}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-busy="true" aria-label="Loading board">
          {STATUSES.map((s) => (
            <div key={s} className="flex flex-col gap-2">
              <div className={`h-8 animate-pulse rounded-lg border border-border-subtle bg-elevated ${COLUMN_META[s].cls} opacity-40`} />
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg border border-border-subtle bg-elevated" />
              ))}
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <Card className="text-center">
          <p className="text-lg font-bold text-text-primary">
            Your tracker is empty
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            Add your first application in the form above, or drag your
            jobhunt-applications.csv into the import drawer — the kanban, ledger,
            analytics and market intelligence will fill up from there.
          </p>
        </Card>
      ) : (
        <>
          {/* board / ledger / archive toggle + view controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-elevated p-1">
              {(["board", "table", "archived"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
                    view === v
                      ? "bg-accent text-white shadow-1"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {v === "board" ? "Board" : v === "table" ? "Ledger" : "Archived"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <p className="hidden text-xs text-text-tertiary sm:block">
                {view === "board"
                  ? "← → to move · Enter to open"
                  : view === "archived"
                    ? "restore or revisit archived applications"
                    : "search · filter · bulk edit · sort"}
              </p>
            </div>
          </div>

          {view === "archived" ? (
            <Card>
              <h3 className="text-base font-bold text-text-primary">
                Archived applications
              </h3>
              <p className="mt-1 text-xs text-text-secondary">
                Archived rows are hidden from the board, ledger and analytics — restore them any time.
              </p>
              {archivedLoading ? (
                <div className="mt-3 flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg border border-border-subtle bg-elevated" />
                  ))}
                </div>
              ) : archivedApps.length === 0 ? (
                <p className="mt-3 rounded-lg border border-border-subtle bg-elevated p-4 text-center text-sm italic text-text-tertiary">
                  Nothing archived yet — use the ✕ on a board card to file it away.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {archivedApps.map((a) => (
                    <li
                      key={a._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-elevated p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary">
                          <Link
                            href={`/applications/${a._id}`}
                            className="underline-offset-2 hover:text-accent hover:underline"
                          >
                            {a.title}
                          </Link>
                          {a.companyName && (
                            <span className="ml-1.5 font-semibold text-text-secondary">at {a.companyName}</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-text-tertiary">
                          {fmtDate(a.dateApplied)}
                          {a.archivedAt && <> · archived {fmtDate(a.archivedAt)}</>}
                          {a.source && <> · <span className="uppercase">{a.source}</span></>}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={restoringId === a._id}
                        onClick={() => restore(a)}
                        title="Restore to active tracker"
                      >
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : view === "table" ? (
            <ApplicationsTable apps={apps} onRefresh={load} />
          ) : (
            <>
              {/* board filter bar */}
              <Card>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Stages:
                  </span>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      aria-pressed={!hiddenStatuses.has(s)}
                      title={hiddenStatuses.has(s) ? `Show ${COLUMN_META[s].label}` : `Hide ${COLUMN_META[s].label}`}
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold transition-all duration-150 ${
                        hiddenStatuses.has(s)
                          ? "border-border-subtle bg-elevated text-text-tertiary opacity-60 line-through"
                          : COLUMN_META[s].cls
                      }`}
                    >
                      {COLUMN_META[s].label}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div className="col-span-2 md:col-span-1">
                    <TextField
                      label="Company"
                      name="board-company"
                      placeholder="Filter by company…"
                      value={companyQ}
                      onChange={(e) => setCompanyQ(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">From</label>
                    <input
                      type="date"
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">To</label>
                    <input
                      type="date"
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Sort</label>
                    <select
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/30"
                      value={boardSort}
                      onChange={(e) => setBoardSort(e.target.value as typeof boardSort)}
                    >
                      <option value="date-desc">Date applied (newest)</option>
                      <option value="updated-desc">Updated (newest)</option>
                      <option value="updated-asc">Updated (oldest)</option>
                      <option value="followup">Follow-ups first</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Compact mode toggle */}
                    <button
                      type="button"
                      onClick={toggleCompact}
                      aria-pressed={compact}
                      title={compact ? "Switch to detailed view" : "Switch to compact view"}
                      className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all duration-150 ${
                        compact
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-elevated text-text-secondary hover:text-text-primary hover:bg-surface"
                      }`}
                    >
                      {compact ? "☰ Compact" : "☰ Compact"}
                    </button>
                    {/* Collapse / Expand all */}
                    <button
                      type="button"
                      onClick={collapsed.size === STATUSES.length ? expandAll : collapseAll}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-xs font-bold text-text-secondary transition-all duration-150 hover:text-text-primary hover:bg-surface"
                    >
                      {collapsed.size === STATUSES.length ? "▾ Expand all" : "▴ Collapse all"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {filtersActive && (
                      <Button type="button" variant="secondary" size="sm" onClick={resetFilters}>
                        Reset filters
                      </Button>
                    )}
                    <span className="text-xs text-text-tertiary">
                      {visible.length} of {apps.length} shown
                    </span>
                  </div>
                </div>
              </Card>

              {/* Kanban columns — responsive */}
              <div
                ref={boardRef}
                className="flex gap-4 overflow-x-auto pb-2 max-sm:flex-col max-sm:overflow-x-hidden sm:flex-row"
              >
                {STATUSES.filter((s) => !hiddenStatuses.has(s)).map((s) => {
                  const allInColumn = byStatusAll(s);
                  const filtered = byStatus(s);
                  const isCollapsed = collapsed.has(s);
                  const isFiltered = filtered.length !== allInColumn.length && (colSearch.searches[s] || "").trim() !== "";
                  const hasSearch = (colSearch.searches[s] || "").trim() !== "";

                  return (
                    <div
                      key={s}
                      className={`flex min-w-0 max-sm:min-w-full sm:min-w-[280px] flex-col gap-2 transition-all duration-300 ease-in-out ${COLUMN_META[s].bgCls} rounded-lg border-l-4 ${COLUMN_META[s].borderCls}`}
                    >
                      {/* Column header — sticky, clickable to collapse */}
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(s)}
                        className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-widest transition-all duration-150 hover:brightness-110"
                        aria-expanded={!isCollapsed}
                        style={{ backgroundColor: "inherit" }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{COLUMN_META[s].label}</span>
                          <span className="rounded-full bg-elevated/80 px-1.5 py-0.5 text-[10px]">
                            {allInColumn.length}
                          </span>
                        </div>
                        <span className="text-text-tertiary text-sm transition-transform duration-200">
                          {isCollapsed ? "▸" : "▾"}
                        </span>
                      </button>

                      {/* Column body — animated collapse */}
                      <div
                        className={`flex min-h-[120px] flex-col gap-2 overflow-hidden px-2 pb-2 transition-all duration-300 ease-in-out ${
                          isCollapsed ? "max-h-0 min-h-0 opacity-0" : `max-h-[calc(100vh-320px)] opacity-100`
                        }`}
                        style={{
                          maskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                          WebkitMaskImage: "linear-gradient(to bottom, black 85%, transparent 100%)",
                        }}
                      >
                        {/* Per-column search */}
                        <div className="flex items-center gap-1 px-1 pt-1">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              value={colSearch.searches[s] || ""}
                              onChange={(e) => colSearch.set(s, e.target.value)}
                              placeholder={`Search ${COLUMN_META[s].label.toLowerCase()}…`}
                              className="w-full rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/30"
                              aria-label={`Search ${COLUMN_META[s].label} column`}
                            />
                            {hasSearch && (
                              <button
                                type="button"
                                onClick={() => colSearch.clear(s)}
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                                aria-label="Clear search"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Cards */}
                        {allInColumn.length === 0 && !filtersActive ? (
                          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-subtle bg-surface/50 p-6 text-center">
                            <span className="text-2xl text-text-tertiary">+</span>
                            <p className="mt-1 text-xs text-text-tertiary">Drop or add applications here</p>
                          </div>
                        ) : isFiltered && filtered.length === 0 ? (
                          <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface/50 p-6 text-center">
                            <span className="text-lg text-text-tertiary">⊘</span>
                            <p className="mt-1 text-xs text-text-tertiary">No matches for current filters</p>
                          </div>
                        ) : filtered.length === 0 && allInColumn.length > 0 && filtersActive ? (
                          <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-surface/50 p-6 text-center">
                            <span className="text-lg text-text-tertiary">⊘</span>
                            <p className="mt-1 text-xs text-text-tertiary">No matches for current filters</p>
                          </div>
                        ) : (
                          <>
                            {filtered.map((app) => (
                              compact ? (
                                /* ---------- COMPACT CARD ---------- */
                                <div
                                  key={app._id}
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`${app.title}${app.companyName ? ` at ${app.companyName}` : ""} — ${COLUMN_META[app.status].label}`}
                                  onKeyDown={(e) => handleCardKeyDown(e, app)}
                                  className={`group relative flex items-center gap-2 rounded-lg border border-l-4 border-border bg-surface px-3 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-2 focus-visible:ring-2 focus-visible:ring-accent ${COLUMN_META[app.status].borderCls} ${
                                    focusedCardId === app._id ? "ring-2 ring-accent" : ""
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-text-primary">{app.title}</p>
                                    {app.companyName && (
                                      <p className="truncate text-xs text-text-secondary">{app.companyName}</p>
                                    )}
                                  </div>
                                  {app.needsFollowUp && (
                                    <span className="animate-pulse inline-flex items-center rounded-full border border-error/30 bg-error/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-error">
                                      Follow up
                                    </span>
                                  )}
                                  <Badge tone={app.status} dot className="shrink-0 !px-1.5 !text-[10px]" />
                                  {/* hover actions */}
                                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                    <select
                                      value={app.status}
                                      onChange={(e) => moveToStatus(app, e.target.value as AppStatus)}
                                      disabled={busyId === app._id}
                                      className="rounded border border-border bg-surface px-1 py-0.5 text-[10px] text-text-primary outline-none focus:border-accent"
                                      aria-label={`Change status for ${app.title}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {STATUSES.map((st) => (
                                        <option key={st} value={st}>{COLUMN_META[st].label}</option>
                                      ))}
                                    </select>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={STATUSES.indexOf(app.status) === 0 || busyId === app._id}
                                      onClick={(e) => { e.stopPropagation(); move(app, -1); }}
                                      title="Move left"
                                      className="!h-6 !px-1.5 text-[10px]"
                                    >
                                      ←
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={STATUSES.indexOf(app.status) === STATUSES.length - 1 || busyId === app._id}
                                      onClick={(e) => { e.stopPropagation(); move(app, 1); }}
                                      title="Move right"
                                      className="!h-6 !px-1.5 text-[10px]"
                                    >
                                      →
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={busyId === app._id}
                                      onClick={(e) => { e.stopPropagation(); archive(app); }}
                                      title="Archive"
                                      className="!h-6 !px-1.5 text-[10px]"
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                /* ---------- DETAILED CARD ---------- */
                                <Card
                                  key={app._id}
                                  hoverable
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`${app.title}${app.companyName ? ` at ${app.companyName}` : ""} — ${COLUMN_META[app.status].label}`}
                                  onKeyDown={(e) => handleCardKeyDown(e, app)}
                                  className={`!p-3 border-l-4 ${COLUMN_META[app.status].borderCls} transition-all duration-150 hover:-translate-y-0.5 hover:shadow-2 ${
                                    focusedCardId === app._id ? "ring-2 ring-accent" : ""
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <Link
                                      href={`/applications/${app._id}`}
                                      className="text-sm font-bold leading-tight text-text-primary underline-offset-2 hover:text-accent hover:underline"
                                      tabIndex={-1}
                                    >
                                      {app.title}
                                    </Link>
                                    <Badge tone={app.status} dot className="shrink-0 !px-1.5 !text-[10px]" />
                                  </div>
                                  {app.needsFollowUp && (
                                    <p className="mt-1 inline-block animate-pulse rounded-full border border-error/30 bg-error/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-error">
                                      Follow up
                                    </p>
                                  )}
                                  {app.companyName && (
                                    <p className="mt-0.5 text-xs font-semibold text-text-secondary">{app.companyName}</p>
                                  )}
                                  <p className="mt-1 text-xs text-text-tertiary">
                                    {fmtDate(app.dateApplied)}
                                    {app.source && <> · <span className="uppercase">{app.source}</span></>}
                                  </p>
                                  {app.salary && (
                                    <p className="mt-0.5 text-xs font-semibold text-success">{app.salary}</p>
                                  )}
                                  {app.jd && (
                                    <p className="mt-1">
                                      <RoleFitScore jd={app.jd} />
                                    </p>
                                  )}
                                  {app.notes && (
                                    <p className="mt-1 line-clamp-2 text-xs italic text-text-tertiary">{app.notes}</p>
                                  )}
                                  {app.applyUrl && (
                                    <a
                                      href={app.applyUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 inline-block text-xs font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:text-text-primary"
                                    >
                                      view posting ↗
                                    </a>
                                  )}
                                  <div className="mt-2 flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1">
                                      <select
                                        value={app.status}
                                        onChange={(e) => moveToStatus(app, e.target.value as AppStatus)}
                                        disabled={busyId === app._id}
                                        className="rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-bold text-text-primary outline-none transition-all duration-150 focus:border-accent focus:ring-1 focus:ring-accent/30"
                                        aria-label={`Change status for ${app.title}`}
                                        title="Quick status change"
                                      >
                                        {STATUSES.map((st) => (
                                          <option key={st} value={st}>{COLUMN_META[st].label}</option>
                                        ))}
                                      </select>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={STATUSES.indexOf(app.status) === 0 || busyId === app._id}
                                        onClick={() => move(app, -1)}
                                        title="Move left"
                                        aria-label={`Move ${app.title} to previous stage`}
                                      >
                                        ←
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={STATUSES.indexOf(app.status) === STATUSES.length - 1 || busyId === app._id}
                                        onClick={() => move(app, 1)}
                                        title="Move right"
                                        aria-label={`Move ${app.title} to next stage`}
                                      >
                                        →
                                      </Button>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={busyId === app._id}
                                      onClick={() => archive(app)}
                                      title="Archive (soft delete — restore later)"
                                      aria-label={`Archive ${app.title}`}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                </Card>
                              )
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
