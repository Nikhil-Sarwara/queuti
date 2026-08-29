"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, TextField } from "@/components/ui";
import { toast } from "@/lib/toast";
import type { KanbanApp } from "@/components/KanbanBoard";

type SortKey = "date-desc" | "date-asc" | "company" | "followup";
type Status = KanbanApp["status"];

const STATUSES: Status[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

const selectCls =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/30";
const chkCls = "h-4 w-4 cursor-pointer accent-accent";

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

/**
 * Ledger-style table view of applications — toggled from the kanban
 * board. Search by company/title, filter by status + date range, sort by
 * date or company, and bulk edit rows: multi-select with checkboxes for
 * bulk status change and bulk archive.
 */
export function ApplicationsTable({
  apps,
  onRefresh,
}: {
  apps: KanbanApp[];
  onRefresh: () => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<Status>("interview");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = apps.filter((a) => {
      if (needle) {
        const hay = `${a.title} ${a.companyName}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (status !== "all" && a.status !== status) return false;
      const day = a.dateApplied.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });

    const sorted = [...filtered];
    if (sort === "date-desc") {
      sorted.sort((a, b) => b.dateApplied.localeCompare(a.dateApplied));
    } else if (sort === "date-asc") {
      sorted.sort((a, b) => a.dateApplied.localeCompare(b.dateApplied));
    } else if (sort === "followup") {
      sorted.sort((a, b) => {
        if (a.needsFollowUp !== b.needsFollowUp) return a.needsFollowUp ? -1 : 1;
        return a.dateApplied.localeCompare(b.dateApplied);
      });
    } else {
      sorted.sort((a, b) =>
        a.companyName.toLowerCase().localeCompare(b.companyName.toLowerCase())
      );
    }
    return sorted;
  }, [apps, q, status, from, to, sort]);

  const visibleIds = rows.map((a) => a._id);
  const allSelected = rows.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function bulkChange() {
    const ids = Array.from(selected);
    if (ids.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; updated: number }>(
        "/api/applications/bulk",
        { method: "POST", body: JSON.stringify({ ids, status: bulkStatus }) }
      );
      toast(`Moved ${res.updated} to ${bulkStatus}`, "success");
      setSelected(new Set());
      onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Bulk update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function bulkArchive() {
    const ids = Array.from(selected);
    if (ids.length === 0 || busy) return;
    if (!confirm(`Archive ${ids.length} selected application${ids.length === 1 ? "" : "s"}?`)) return;
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; updated: number }>(
        "/api/applications/bulk",
        { method: "POST", body: JSON.stringify({ ids, archived: true }) }
      );
      toast(`Archived ${res.updated} application${res.updated === 1 ? "" : "s"}`, "success");
      setSelected(new Set());
      onRefresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Bulk archive failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        {/* ---- filter bar ---- */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <TextField
              label="Search"
              name="table-search"
              placeholder="Company or job title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Status
            </label>
            <select
              className={`mt-1.5 w-full ${selectCls}`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
              <option value="ghosted">Ghosted</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              From
            </label>
            <input
              type="date"
              className={`mt-1.5 w-full ${selectCls}`}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              To
            </label>
            <input
              type="date"
              className={`mt-1.5 w-full ${selectCls}`}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-tertiary">
            {rows.length} of {apps.length} applications
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Sort
            </label>
            <select
              className={selectCls}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="date-desc">Date (newest first)</option>
              <option value="date-asc">Date (oldest first)</option>
              <option value="company">Company (A–Z)</option>
              <option value="followup">Follow-ups first</option>
            </select>
          </div>
        </div>

        {/* ---- bulk action bar ---- */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
              {selected.size} selected
            </span>
            <select
              className={`${selectCls} !py-1.5`}
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as Status)}
              aria-label="Bulk target status"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  Move to {s}
                </option>
              ))}
            </select>
            <Button type="button" variant="primary" size="sm" onClick={bulkChange} disabled={busy}>
              {busy ? "Applying…" : "Apply status"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={bulkArchive} disabled={busy}>
              Archive
            </Button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-bold uppercase tracking-wider text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
            >
              clear
            </button>
          </div>
        )}

        {/* ---- the table ---- */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-elevated text-xs uppercase tracking-widest text-text-secondary">
                <th className="w-9 border-b border-border-subtle px-2 py-2.5">
                  <input
                    type="checkbox"
                    className={chkCls}
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={rows.length === 0}
                    aria-label="Select all visible"
                  />
                </th>
                <th className="border-b border-border-subtle px-3 py-2.5 font-bold">Role</th>
                <th className="border-b border-border-subtle px-3 py-2.5 font-bold">Company</th>
                <th className="border-b border-border-subtle px-3 py-2.5 font-bold">Status</th>
                <th className="border-b border-border-subtle px-3 py-2.5 font-bold">Source</th>
                <th className="border-b border-border-subtle px-3 py-2.5 font-bold">Applied</th>
                <th className="border-b border-border-subtle px-3 py-2.5 font-bold">Posting</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm italic text-text-tertiary">
                    {apps.length === 0
                      ? "No applications yet — add one above or import a CSV."
                      : "No applications match your filters."}
                  </td>
                </tr>
              ) : (
                rows.map((a, i) => (
                  <tr
                    key={a._id}
                    className={`border-b border-border-subtle transition-all duration-150 hover:bg-elevated ${
                      selected.has(a._id) ? "bg-accent/10" : ""
                    }`}
                  >
                    <td className="px-2 py-2.5">
                      <input
                        type="checkbox"
                        className={chkCls}
                        checked={selected.has(a._id)}
                        onChange={() => toggle(a._id)}
                        aria-label={`Select ${a.title}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-semibold">
                      <Link
                        href={`/applications/${a._id}`}
                        className="underline-offset-2 hover:text-accent hover:underline"
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">
                      {a.companyName || <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={a.status} dot className="!px-2 !text-[10px]">
                        {a.status}
                      </Badge>
                      {a.needsFollowUp && (
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-error">
                          follow up
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs uppercase tracking-wide text-text-secondary">
                      {a.source || <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-text-secondary">
                      {fmtDate(a.dateApplied)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {a.applyUrl ? (
                        <a
                          href={a.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:text-text-primary"
                        >
                          view ↗
                        </a>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
