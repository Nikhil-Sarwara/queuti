"use client";

import { useMemo, useState } from "react";
import { Badge, Card, TextField } from "@/components/ui";
import type { KanbanApp } from "@/components/KanbanBoard";

type SortKey = "date-desc" | "date-asc" | "company";

const selectCls =
  "rounded-md border border-ink/30 bg-ink/10 px-2.5 py-2 text-sm text-ink shadow-engraved outline-none transition focus:border-brass focus:bg-paper-light/60 focus:ring-2 focus:ring-brass/30";

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
 * Ledger-style table view of applications (#13) — toggled from the kanban
 * board. Search by company/title, filter by status + date range, sort by
 * date or company. All filtering is client-side over the same apps the
 * board already holds, so both views always agree.
 */
export function ApplicationsTable({ apps }: { apps: KanbanApp[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");

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
    } else {
      sorted.sort((a, b) =>
        a.companyName.toLowerCase().localeCompare(b.companyName.toLowerCase())
      );
    }
    return sorted;
  }, [apps, q, status, from, to, sort]);

  return (
    <Card material="paper" framed className="shadow-bevel-lg">
      <div className="flex flex-col gap-3">
        {/* ---- filter bar (ledger desk) ---- */}
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
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
          <p className="text-xs uppercase tracking-wider opacity-60">
            {rows.length} of {apps.length} applications
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
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
            </select>
          </div>
        </div>

        {/* ---- the ledger ---- */}
        <div className="overflow-x-auto rounded-md border border-ink/25 shadow-engraved">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gradient-to-b from-paper-dark to-paper text-[11px] uppercase tracking-widest text-ink-soft">
                <th className="border-b border-ink/20 px-3 py-2 font-bold">Role</th>
                <th className="border-b border-ink/20 px-3 py-2 font-bold">Company</th>
                <th className="border-b border-ink/20 px-3 py-2 font-bold">Status</th>
                <th className="border-b border-ink/20 px-3 py-2 font-bold">Source</th>
                <th className="border-b border-ink/20 px-3 py-2 font-bold">Applied</th>
                <th className="border-b border-ink/20 px-3 py-2 font-bold">Posting</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm italic opacity-60">
                    {apps.length === 0
                      ? "No applications yet — add one above or import a CSV."
                      : "No applications match your filters."}
                  </td>
                </tr>
              ) : (
                rows.map((a, i) => (
                  <tr
                    key={a._id}
                    className={`border-b border-ink/10 transition hover:bg-brass/10 ${
                      i % 2 === 1 ? "bg-ink/[0.035]" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-semibold">{a.title}</td>
                    <td className="px-3 py-2 text-ink-soft">
                      {a.companyName || <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={a.status} dot className="!px-2 !text-[10px]">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs uppercase tracking-wide opacity-70">
                      {a.source || <span className="opacity-40">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs">
                      {fmtDate(a.dateApplied)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {a.applyUrl ? (
                        <a
                          href={a.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brass-dark underline decoration-brass/50 underline-offset-2 hover:text-ink"
                        >
                          view ↗
                        </a>
                      ) : (
                        <span className="opacity-40">—</span>
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