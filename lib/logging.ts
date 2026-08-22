/**
 * Structured error logging (#40).
 *
 * - `reportError` writes a single-line JSON record to the server console and,
 *   if ERROR_WEBHOOK_URL is set, fire-and-forgets a JSON POST to that webhook
 *   (e.g. a Discord/Slack/ntfy endpoint) — never blocking the request.
 * - `getLastErrors` returns the in-process ring buffer of recent errors so
 *   /api/health and the dashboard status card can summarize them.
 * - `getUptime` reports process uptime for the health endpoint.
 *
 * Note: Next.js middleware runs in the edge runtime, so request IDs are
 * generated there with crypto.randomUUID() and attached via an `x-request-id`
 * header; handlers log through here in the Node runtime.
 */

export interface ErrorRecord {
  requestId: string;
  /** ISO timestamp of when the error was recorded. */
  ts: string;
  /** HTTP method + path the error occurred on, when known. */
  route?: string;
  /** Short, human-readable error message. */
  message: string;
  /** Stack trace (first few lines) when available. */
  stack?: string;
}

const MAX_RECORDS = 50;
const recentErrors: ErrorRecord[] = [];

/**
 * Record an error: console JSON line + optional webhook POST + ring buffer.
 * Fire-and-forget: never throws, never blocks the caller.
 */
export function reportError(record: ErrorRecord) {
  const rec: ErrorRecord = {
    requestId: record.requestId || "-",
    ts: record.ts || new Date().toISOString(),
    route: record.route,
    message: record.message,
    stack: record.stack,
  };

  // 1) structured JSON line to the server console (parseable by log shippers)
  console.error(JSON.stringify({ level: "error", ...rec }));

  // 2) in-process ring buffer for /api/health + dashboard status card
  recentErrors.push(rec);
  if (recentErrors.length > MAX_RECORDS) recentErrors.shift();

  // 3) optional webhook — fire and forget, errors here are swallowed
  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (webhook) {
    fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `[queuti] error ${rec.message}`,
        ...rec,
      }),
    }).catch(() => {
      /* webhook delivery is best-effort */
    });
  }
}

/** Most recent errors, newest first. */
export function getLastErrors(limit = 10): ErrorRecord[] {
  return recentErrors.slice(-limit).reverse();
}

/** Clear the in-process error buffer (mainly for tests). */
export function clearErrors() {
  recentErrors.length = 0;
}

/** Process uptime in seconds, for the /api/health endpoint. */
export function getUptime() {
  return Math.round(process.uptime());
}