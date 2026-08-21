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

/**
 * Browser ML panel (#9) — job-score classifier + role-fit recommender.
 * Runs entirely in the browser via Transformers.js (quantized MNLI,
 * ~25MB, cached after first download). No API keys, no server calls.
 */
export function MlPanel() {
  const [state, setState] = useState<MlState>("idle");
  const [roleResults, setRoleResults] = useState<RoleFitResult[] | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [scoreText, setScoreText] = useState("");
  const [scoreRole, setScoreRole] = useState("");
  const [scoreResult, setScoreResult] = useState<{ role: string; score: number } | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Warm the model on mount (lazy: starts download only when panel shows).
  useEffect(() => {
    let mounted = true;
    setState("loading");
    mlStatus().then((s) => {
      if (mounted) setState(s === "ready" ? "ready" : "unavailable");
    });
    return () => {
      mounted = false;
    };
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

  const modelNote =
    state === "loading"
      ? "Downloading ML model (~25MB, one-time, cached by your browser)…"
      : state === "unavailable"
        ? "Model unavailable — browser ML needs a network connection."
        : "Model ready in your browser.";

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-engraved">🧠 Browser ML</h2>
        <Badge tone={state === "ready" ? "interview" : state === "loading" ? "applied" : "rejected"}>
          {state === "ready" ? "model loaded" : state === "loading" ? "loading model" : "offline"}
        </Badge>
      </div>
      <p className="mt-1 text-xs opacity-60">
        {modelNote} Runs 100% client-side — nothing leaves your browser.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {/* Role-fit recommender */}
        <Card material="leather" framed className="flex flex-col">
          <h3 className="font-display text-sm font-bold text-paper-light">
            🎯 Role-fit recommender
          </h3>
          <p className="mt-1 text-xs text-paper-light/70">
            Analyses the titles you&apos;ve applied to and tells you which roles
            you&apos;re actually targeting.
          </p>
          <div className="mt-3 flex-1">
            {roleResults ? (
              <ul className="space-y-2">
                {roleResults.map((r) => (
                  <li key={r.role} className="rounded-md border border-paper-light/20 bg-ink/25 p-2.5">
                    <div className="flex items-center justify-between text-sm text-paper-light">
                      <span className="font-semibold">{r.role}</span>
                      <span className="font-bold text-brass-light">{r.avgScore}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-ink/60">
                      <div
                        className="h-full rounded-sm bg-gradient-to-b from-brass-light to-brass"
                        style={{ width: `${Math.min(100, r.avgScore)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-paper-light/60">
                      from {r.applications} application{r.applications === 1 ? "" : "s"} · e.g.{" "}
                      <span className="italic">{r.topTitle}</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-paper-light/70">
                {roleError
                  ? `⚠️ ${roleError}`
                  : "Recommendations appear here once you run the analysis."}
              </p>
            )}
          </div>
          <Button
            variant="brass"
            className="mt-3 w-full"
            disabled={busy || state === "unavailable"}
            onClick={runRoleFit}
          >
            {busy ? "Analysing…" : "Analyse my applications"}
          </Button>
        </Card>

        {/* Job-score classifier */}
        <Card className="flex flex-col">
          <h3 className="font-display text-sm font-bold text-engraved">
            📄 Job-score classifier
          </h3>
          <p className="mt-1 text-xs opacity-70">
            Paste a job description and a target role — get a fit score
            (0–100) from the model.
          </p>
          <div className="mt-3 flex flex-1 flex-col gap-3">
            <textarea
              value={scoreText}
              onChange={(e) => setScoreText(e.target.value)}
              placeholder="Paste the job description here…"
              rows={5}
              className="w-full flex-1 resize-none rounded-md border border-ink/30 bg-ink/10 px-3 py-2 text-sm text-ink shadow-engraved outline-none transition placeholder:text-ink-faint focus:border-brass focus:bg-paper-light/60 focus:ring-2 focus:ring-brass/30"
            />
            <input
              value={scoreRole}
              onChange={(e) => setScoreRole(e.target.value)}
              placeholder="Target role (e.g. Full-stack Developer)"
              className="w-full rounded-md border border-ink/30 bg-ink/10 px-3 py-2 text-sm text-ink shadow-engraved outline-none transition placeholder:text-ink-faint focus:border-brass focus:ring-2 focus:ring-brass/30"
            />
            {scoreResult && (
              <div className="rounded-md border border-brass/40 bg-paper-light/70 p-3 text-center shadow-bevel-sm">
                <p className="font-display text-3xl font-bold text-engraved">
                  {scoreResult.score}
                  <span className="text-base opacity-60">/100</span>
                </p>
                <p className="mt-1 text-xs opacity-70">
                  fit as <strong>{scoreResult.role}</strong>
                </p>
              </div>
            )}
            {scoreError && (
              <p className="text-xs text-blood-dark">⚠️ {scoreError}</p>
            )}
            <Button
              variant="leather"
              className="w-full"
              disabled={busy || state === "unavailable" || !scoreText.trim()}
              onClick={runScore}
            >
              {busy ? "Scoring…" : "Score this job"}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}