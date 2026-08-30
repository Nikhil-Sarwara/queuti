"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { mlStatus, recommendRoles, scoreJob } from "@/lib/ml";
import type { RoleFitResult } from "@/lib/ml";

interface KanbanApp {
  _id: string;
  title: string;
  companyName: string;
  status: string;
}

type MlState = "idle" | "loading" | "ready" | "unavailable";

/* ── Score ring — circular SVG gauge ── */
function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "var(--color-success, #22c55e)" :
    score >= 50 ? "var(--color-accent, #6366f1)" :
    score >= 30 ? "var(--color-warning, #f59e0b)" :
    "var(--color-error, #ef4444)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-border-subtle" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-text-primary leading-none">{score}</span>
        <span className="text-[9px] text-text-tertiary">{label || '/100'}</span>
      </div>
    </div>
  );
}

/**
 * Career Compass — AI-powered role analysis and job fit scoring.
 * Runs 100% client-side via Transformers.js (zero-shot classification).
 */
export function MlPanel({ fill }: { fill?: boolean }) {
  const [state, setState] = useState<MlState>("idle");
  const [roleResults, setRoleResults] = useState<RoleFitResult[] | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [scoreText, setScoreText] = useState("");
  const [scoreRole, setScoreRole] = useState("");
  const [scoreResult, setScoreResult] = useState<{ role: string; score: number } | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"roles" | "score">("roles");

  useEffect(() => {
    let mounted = true;
    setState("loading");
    mlStatus().then((s) => {
      if (mounted) setState(s === "ready" ? "ready" : "unavailable");
    });
    return () => { mounted = false; };
  }, []);

  const runRoleFit = useCallback(async () => {
    setBusy(true);
    setRoleError(null);
    setRoleResults(null);
    try {
      const res = await fetch("/api/applications", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { applications } = await res.json();
      const titles = (applications as KanbanApp[]).map((a) => a.title);
      const out = await recommendRoles(titles);
      if ("error" in out) setRoleError(out.error);
      else setRoleResults(out);
    } catch (e) {
      setRoleError(e instanceof Error ? e.message : "Failed to fetch applications");
    } finally {
      setBusy(false);
    }
  }, []);

  const runScore = useCallback(async () => {
    setBusy(true);
    setScoreError(null);
    setScoreResult(null);
    try {
      const out = await scoreJob(scoreText, scoreRole);
      if ("error" in out) setScoreError(out.error);
      else setScoreResult(out);
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setBusy(false);
    }
  }, [scoreText, scoreRole]);

  const stateBadge = () => {
    if (state === "loading") return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
        <span className="text-[10px] font-semibold text-warning">Loading</span>
      </div>
    );
    if (state === "unavailable") return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-error" />
        <span className="text-[10px] font-semibold text-error">Offline</span>
      </div>
    );
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-[10px] font-semibold text-success">Ready</span>
      </div>
    );
  };

  return (
    <section className={fill ? "flex h-full flex-col" : "mt-8"}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-text-primary">🧭 Career Compass</h2>
          {stateBadge()}
        </div>
        {state === "loading" && (
          <span className="text-[10px] text-text-tertiary">One-time model download</span>
        )}
      </div>

      {/* Tab switcher */}
      <div className="mt-2 flex gap-1 rounded-lg border border-border-subtle bg-elevated/50 p-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`flex-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
            activeTab === "roles"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          📍 Role Radar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("score")}
          className={`flex-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
            activeTab === "score"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          ✨ Fit Score
        </button>
      </div>

      {/* Content */}
      <div className="mt-2 flex-1">
        {activeTab === "roles" ? (
          <RoleFitTab
            results={roleResults}
            error={roleError}
            busy={busy}
            unavailable={state === "unavailable"}
            onAnalyse={runRoleFit}
          />
        ) : (
          <ScoreTab
            text={scoreText}
            setText={setScoreText}
            role={scoreRole}
            setRole={setScoreRole}
            result={scoreResult}
            error={scoreError}
            busy={busy}
            unavailable={state === "unavailable"}
            onScore={runScore}
          />
        )}
      </div>
    </section>
  );
}

/* ── Role Fit sub-tab ── */
function RoleFitTab({
  results, error, busy, unavailable, onAnalyse,
}: {
  results: RoleFitResult[] | null;
  error: string | null;
  busy: boolean;
  unavailable: boolean;
  onAnalyse: () => void;
}) {
  if (results && results.length > 0) {
    const maxScore = Math.max(...results.map((r) => r.avgScore));
    return (
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li key={r.role} className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-elevated/50 px-2.5 py-2">
            {/* Score bar */}
            <div className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-border-subtle">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${(r.avgScore / maxScore) * 100}%` }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-xs font-semibold text-text-primary">{r.role}</span>
                <span className="shrink-0 text-xs font-bold text-accent">{r.avgScore}%</span>
              </div>
              <p className="text-[10px] text-text-tertiary truncate">
                {r.applications} app{r.applications === 1 ? "" : "s"} · {r.topTitle}
              </p>
            </div>
          </li>
        ))}
        <li className="pt-1">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={busy || unavailable}
            onClick={onAnalyse}
          >
            {busy ? "Analysing…" : "Re-analyse"}
          </Button>
        </li>
      </ul>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
      <span className="text-2xl opacity-40">🎯</span>
      <p className="text-xs text-text-tertiary">
        {error
          ? error
          : "Analyse your applications to see which roles you're targeting."}
      </p>
      <Button
        variant="primary"
        size="sm"
        className="mt-1"
        disabled={busy || unavailable}
        onClick={onAnalyse}
      >
        {busy ? "Analysing…" : "Analyse my applications"}
      </Button>
    </div>
  );
}

/* ── Score Job sub-tab ── */
function ScoreTab({
  text, setText, role, setRole, result, error, busy, unavailable, onScore,
}: {
  text: string;
  setText: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  result: { role: string; score: number } | null;
  error: string | null;
  busy: boolean;
  unavailable: boolean;
  onScore: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a job description…"
        aria-label="Job description for scoring"
        rows={4}
        className="w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Target role (e.g. Full-stack Developer)"
        aria-label="Target role"
        className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30"
      />

      {/* Result */}
      {result && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
          <ScoreRing score={result.score} size={64} label="fit" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary">
              {result.score >= 80 ? "🎯 Strong match" :
               result.score >= 50 ? "👍 Good fit" :
               result.score >= 30 ? "🤔 Partial fit" :
               "❌ Poor fit"}
            </p>
            <p className="mt-0.5 text-[10px] text-text-tertiary">
              as <strong className="text-text-secondary">{result.role}</strong>
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-error/10 px-2 py-1.5 text-[10px] text-error">{error}</p>
      )}

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        disabled={busy || unavailable || !text.trim()}
        onClick={onScore}
      >
        {busy ? "Scoring…" : "Score this job"}
      </Button>
    </div>
  );
}
