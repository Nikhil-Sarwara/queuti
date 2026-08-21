/**
 * Browser ML (#9) — Transformers.js, client-side only. No API keys,
 * no server ML. The ~25MB quantized MNLI model downloads to the browser
 * once and is cached by the browser after the first use.
 *
 * All imports are dynamic so Next.js never bundles the runtime into the
 * server build — the model/pipeline exists only in the user's browser.
 */

export type MlPipeline = "zero-shot-classification";

const ROLE_LABELS: string[] = [
  "Frontend Developer",
  "Backend Developer",
  "Full-stack Developer",
  "DevOps / SRE",
  "Data Engineer",
  "Data Scientist / ML Engineer",
  "Mobile Developer",
  "QA / Test Automation",
  "Product Manager",
  "UX / UI Designer",
  "Cloud / Infrastructure Engineer",
  "Security Engineer",
] as const;

let pipelinePromise: Promise<import("@xenova/transformers").ZeroShotClassificationPipeline | null> | null =
  null;

/** Lazily load the zero-shot pipeline (browser only). */
function loadPipeline() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      // Quantized distilled MNLI — small enough for the browser (~25MB).
      return (await pipeline("zero-shot-classification", "Xenova/mobilebert-uncased-mnli")) as import(
        "@xenova/transformers"
      ).ZeroShotClassificationPipeline;
    })().catch((err) => {
      console.error("[queuti] ML pipeline load failed:", err);
      pipelinePromise = null; // allow retry
      return null;
    });
  }
  return pipelinePromise;
}

export interface RoleFitResult {
  role: string;
  avgScore: number; // 0..100 mean confidence across this user's roles
  applications: number;
  topTitle: string;
}

/**
 * Role-fit recommender: classify each of the user's application titles
 * against the role taxonomy (one forward pass per unique title), then
 * average per role. Returns top roles with confidence.
 */
export async function recommendRoles(
  titles: string[]
): Promise<RoleFitResult[] | { error: string }> {
  const pipe = await loadPipeline();
  if (!pipe) return { error: "Model failed to load — check network and retry." };

  const unique = Array.from(new Set(titles.map((t) => t.trim()).filter(Boolean)));
  if (unique.length === 0) return { error: "No application titles to analyse yet." };

  const total = new Map<string, number>();
  const count = new Map<string, number>();
  const topTitle = new Map<string, string>();

  let finished = 0;
  // classify per unique title; aggregate into role score maps
  const perTitle = await Promise.all(
    unique.map(async (title) => {
      const out = (await pipe(title, ROLE_LABELS)) as import(
        "@xenova/transformers"
      ).ZeroShotClassificationOutput;
      return { title, labels: out.labels, scores: out.scores };
    })
  );
  void finished;

  for (const r of perTitle) {
    r.labels.forEach((label, i) => {
      const score = r.scores[i] * 100;
      total.set(label, (total.get(label) ?? 0) + score);
      count.set(label, (count.get(label) ?? 0) + 1);
      if (!topTitle.has(label) || score > 0) {
        topTitle.set(label, r.title);
      }
    });
  }

  const results: RoleFitResult[] = ROLE_LABELS.filter((l) => (count.get(l) ?? 0) > 0).map(
    (label) => ({
      role: label,
      avgScore: Math.round((total.get(label)! / count.get(label)!) * 10) / 10,
      applications: count.get(label) ?? 0,
      topTitle: topTitle.get(label) ?? "",
    })
  );
  results.sort((a, b) => b.avgScore - a.avgScore);
  return results.slice(0, 5);
}

export interface JobScoreResult {
  role: string;
  score: number; // 0..100 fit of the description to the role
  labels: string[];
  scores: number[];
}

/**
 * Job-score classifier: given a pasted job description + target role,
 * zero-shot classify ["A {role} role", "Not a {role} role"] and return
 * the fit percentage for the positive label.
 */
export async function scoreJob(
  description: string,
  targetRole: string
): Promise<JobScoreResult | { error: string }> {
  const pipe = await loadPipeline();
  if (!pipe) return { error: "Model failed to load — check network and retry." };
  const text = description.trim();
  if (!text) return { error: "Paste a job description first." };
  const role = targetRole.trim() || "Software Engineer";

  const out = (await pipe(text, [`A ${role} role`, `Not a ${role} role`])) as import(
    "@xenova/transformers"
  ).ZeroShotClassificationOutput;
  const posIdx = out.labels.indexOf(`A ${role} role`);
  const score = posIdx >= 0 ? Math.round(out.scores[posIdx] * 100) : 0;
  return { role, score, labels: out.labels, scores: out.scores.map((s) => Math.round(s * 100)) };
}

export async function mlStatus(): Promise<"loading" | "ready" | "unavailable"> {
  const pipe = await loadPipeline();
  return pipe ? "ready" : "unavailable";
}