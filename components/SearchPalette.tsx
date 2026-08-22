"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

interface SearchApp {
  _id: string;
  title: string;
  companyName: string;
  status: string;
  dateApplied: string;
  needsFollowUp: boolean;
}
interface SearchCompany {
  _id: string;
  name: string;
  website: string;
}
interface SearchContact {
  _id: string;
  name: string;
  email: string;
}
interface SearchResults {
  applications: SearchApp[];
  companies: SearchCompany[];
  contacts: SearchContact[];
}

type GroupKey = "applications" | "companies" | "contacts";
const GROUP_LABEL: Record<GroupKey, string> = {
  applications: "Applications",
  companies: "Companies",
  contacts: "Contacts",
};

const EMPTY: SearchResults = { applications: [], companies: [], contacts: [] };

/**
 * Global search palette (#32) — Cmd/Ctrl+K anywhere in the app. Fuzzy-ish
 * regex search over applications (title/company/notes/jd), companies and
 * contacts; keyboard nav (↑/↓/Enter/Esc); deep-links to application detail
 * pages.
 */
export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd/Ctrl+K toggle, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setResults(EMPTY);
    setActive(0);
    // Focus after the overlay mounts.
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const flat = useCallback((): { key: GroupKey; id: string }[] => {
    const rows: { key: GroupKey; id: string }[] = [];
    for (const g of Object.keys(GROUP_LABEL) as GroupKey[]) {
      for (const item of results[g]) rows.push({ key: g, id: item._id });
    }
    return rows;
  }, [results]);

  // Debounced search.
  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SearchResults;
        setResults(data);
        setActive(0);
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [q, open]);

  const go = (idx: number) => {
    const rows = flat();
    const hit = rows[idx];
    if (!hit) return;
    setOpen(false);
    if (hit.key === "applications") {
      router.push(`/applications/${hit.id}`);
    } else {
      // Companies/contacts live in the dashboard CRM panels.
      router.push("/dashboard");
    }
  };

  if (!open) return null;

  const rows = flat();
  const total = rows.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <Card material="paper" framed className="w-full max-w-xl shadow-bevel-lg">
        <div className="flex items-center gap-2 border-b border-ink/15 px-3 py-2.5">
          <span className="text-base opacity-60">🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, Math.max(total - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(active);
              }
            }}
            placeholder="Search applications, companies, contacts…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint/60"
            role="combobox"
            aria-expanded="true"
            aria-label="Global search"
          />
          <kbd className="rounded border border-ink/25 bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold text-ink-soft shadow-engraved">
            esc
          </kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {loading && (
            <p className="px-3 py-4 text-center text-xs italic opacity-60">
              Searching…
            </p>
          )}
          {!loading && q.trim().length < 2 && (
            <p className="px-3 py-4 text-center text-xs italic opacity-60">
              Type at least 2 characters to search (title, company, notes, JD,
              people).
            </p>
          )}
          {!loading && q.trim().length >= 2 && total === 0 && (
            <p className="px-3 py-4 text-center text-xs italic opacity-60">
              No matches for “{q.trim()}”.
            </p>
          )}
          {!loading &&
            (Object.keys(GROUP_LABEL) as GroupKey[]).map(
              (g) =>
                results[g].length > 0 && (
                  <div key={g} className="mb-1">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                      {GROUP_LABEL[g]}
                    </p>
                    <ul>
                      {results[g].map((item, i) => {
                        const gi = rows.findIndex(
                          (r) => r.key === g && r.id === item._id
                        );
                        const isActive = gi === active;
                        return (
                          <li key={item._id}>
                            <button
                              type="button"
                              onMouseEnter={() => setActive(gi)}
                              onClick={() => go(gi)}
                              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                                isActive
                                  ? "bg-gradient-to-b from-brass-light/60 to-brass/40 shadow-bevel-sm"
                                  : "hover:bg-ink/5"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-ink">
                                  {g === "applications"
                                    ? (item as SearchApp).title
                                    : (item as SearchCompany | SearchContact).name}
                                </span>
                                <span className="block truncate text-[11px] opacity-60">
                                  {g === "applications"
                                    ? ((item as SearchApp).companyName || "no company") +
                                      (item as SearchApp).needsFollowUp
                                      ? " · ⏰ follow up"
                                      : ""
                                    : g === "companies"
                                      ? (item as SearchCompany).website || ""
                                      : (item as SearchContact).email || ""}
                                </span>
                              </span>
                              <span className="shrink-0 text-[10px] uppercase tracking-wide opacity-50">
                                {(item as SearchApp).status ?? g.slice(0, -1)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )
            )}
        </div>

        <div className="flex items-center gap-3 border-t border-ink/15 px-3 py-1.5 text-[10px] uppercase tracking-wider opacity-55">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span className="ml-auto">⌘K toggles</span>
        </div>
      </Card>
    </div>
  );
}