// Follow-up staleness rules (#30).
//
// An application "needs a follow-up" when it's been sitting without a
// response past the courtesy window:
//   - applied / screening: no response (respondedAt unset) for 7+ days
//   - ghosted: marked ghosted 3+ days ago (updatedAt is when it was ghosted)
// Everything else (interview/offer/rejected, or a live response) never flags.

import type { ApplicationStatus } from "@/lib/models";

const DAY_MS = 24 * 60 * 60 * 1000;
export const APPLIED_WINDOW_DAYS = 7;
export const GHOSTED_WINDOW_DAYS = 3;

export interface FollowUpCandidate {
  status: ApplicationStatus;
  dateApplied: Date | string;
  respondedAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

function ms(v: Date | string | null | undefined): number | null {
  if (v == null) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * How many days overdue a follow-up is, or null when this application does
 * not need one yet. Pure + injectable clock (tests pass a fixed `now`).
 */
export function followUpDays(
  app: FollowUpCandidate,
  now: number = Date.now()
): number | null {
  const applied = ms(app.dateApplied);
  if (applied === null) return null;

  if (app.status === "applied" || app.status === "screening") {
    if (app.respondedAt) return null; // someone answered — no follow-up needed
    const elapsed = now - applied;
    if (elapsed < APPLIED_WINDOW_DAYS * DAY_MS) return null;
    return Math.floor(elapsed / DAY_MS);
  }

  if (app.status === "ghosted") {
    const ref = ms(app.updatedAt) ?? applied;
    const elapsed = now - ref;
    if (elapsed < GHOSTED_WINDOW_DAYS * DAY_MS) return null;
    return Math.floor(elapsed / DAY_MS);
  }

  return null;
}

/** True when followUpDays() is non-null for this application. */
export function needsFollowUp(
  app: FollowUpCandidate,
  now: number = Date.now()
): boolean {
  return followUpDays(app, now) !== null;
}