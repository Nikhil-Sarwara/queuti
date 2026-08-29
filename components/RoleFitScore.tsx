"use client";

import { useEffect, useMemo, useState } from "react";
import { matchRole } from "@/lib/ml";
import type { JobScoreResult } from "@/lib/ml";

interface Props {
  /** Pasted job description; when empty the badge renders nothing. */
  jd: string;
}

/**
 * Role-fit score badge — runs the browser Transformers.js classifier
 * on the application's job description and shows the best-matching role +
 * confidence. No server calls; the quantized model is downloaded once and
 * shared (loadPipeline memoises it) across every badge on the page.
 */
export function RoleFitScore({ jd }: Props) {
  const text = useMemo(() => jd?.trim() ?? "", [jd]);
  const [result, setResult] = useState<JobScoreResult | null>(null);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">(
    text ? "idle" : "done"
  );

  useEffect(() => {
    if (!text) {
      setState("done");
      setResult(null);
      return;
    }
    let cancelled = false;
    setState("running");
    setResult(null);
    matchRole(text).then((out) => {
      if (cancelled) return;
      if ("error" in out) {
        setState("error");
      } else {
        setResult(out);
        setState("done");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!text) return null;
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-bold text-error">
        ML offline
      </span>
    );
  }
  if (state === "running" || !result) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-bold text-text-tertiary">
        scoring…
      </span>
    );
  }

  // Color based on score: green for high, yellow for mid, red for low
  const colorClass =
    result.score >= 70
      ? "bg-success/10 text-success"
      : result.score >= 40
        ? "bg-warning/10 text-warning"
        : "bg-error/10 text-error";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${colorClass}`}>
      {result.score}% {result.role}
    </span>
  );
}
