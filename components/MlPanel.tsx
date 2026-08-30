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
 * Browser ML panel — job-score classifier + role-fit recommender.
 * Runs entirely in the browser via Transformers.js (quantized MNLI,
 * ~25MB, cached after first download). No API keys, no server calls.
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
    <section className={fill ? "flex h-full flex-col" : "mt-8"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-text-primary">Browser ML</h2>
        <Badge tone={state === "ready" ? "interview" : state === "loading" ? "applied" : "rejected"}>
          {state === "ready" ? "model loaded" : state === "loading" ? "loading model" : "offline"}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-text-secondary">
        {modelNote} Runs 100% client-side — nothing leaves your browser.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {/* Role-fit recommender */}
        <Card className="flex flex-col">
          <h3 className="text-sm font-bold text-text-primary">
            Role-fit recommender
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Analyses the titles you&apos;ve applied to and tells you which roles
            you&apos;re actually targeting.
          </p>
          <div className="mt-3 flex-1">
            {roleResults ? (
              <ul className="space-y-2">
                {roleResults.map((r) => (
                  <li key={r.role} className="rounded-lg border border-border-subtle bg-elevated p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-text-primary">{r.role}</span>
                      <span className="font-bold text-accent">{r.avgScore}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-md bg-elevated">
                      <div
                        className="h-full rounded-md bg-accent"
                        style={{ width: `${Math.min(100, r.avgScore)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      from {r.applications} application{r.applications === 1 ? "" : "s"} · e.g.{" "}
                      <span className="italic">{r.topTitle}</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-text-secondary">
                {roleError
                  ? roleError
                  : "Recommendations appear here once you run the analysis."}
              </p>
            )}
          </div>
          <Button
            variant="primary"
            className="mt-3 w-full"
            disabled={busy || state === "unavailable"}
            onClick={runRoleFit}
          >
            {busy ? "Analysing…" : "Analyse my applications"}
          </Button>
        </Card>

        {/* Job-score classifier */}
        <Card className="flex flex-col">
          <h3 className="text-sm font-bold text-text-primary">
            Job-score classifier
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Paste a job description and a target role — get a fit score
            (0–100) from the model.
          </p>
          <div className="mt-3 flex flex-1 flex-col gap-3">
            <textarea
              value={scoreText}
              onChange={(e) => setScoreText(e.target.value)}
              placeholder="Paste the job description here…"
              aria-label="Job description for scoring"
              rows={5}
              className="w-full flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <input
              value={scoreRole}
              onChange={(e) => setScoreRole(e.target.value)}
              placeholder="Target role (e.g. Full-stack Developer)"
              aria-label="Target role"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            {scoreResult && (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 text-center">
                <p className="text-3xl font-bold text-text-primary">
                  {scoreResult.score}
                  <span className="text-base text-text-secondary">/100</span>
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  fit as <strong>{scoreResult.role}</strong>
                </p>
              </div>
            )}
            {scoreError && (
              <p className="text-xs text-error">{scoreError}</p>
            )}
            <Button
              variant="primary"
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
