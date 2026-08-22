import { describe, expect, it } from "vitest";
import type { FollowUpCandidate } from "@/lib/followup";
import { followUpDays, needsFollowUp } from "@/lib/followup";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000; // fixed clock

const app = (over: Record<string, unknown> = {}): FollowUpCandidate => ({
  status: "applied",
  dateApplied: new Date(NOW - 10 * DAY).toISOString(),
  ...over,
} as FollowUpCandidate);

describe("follow-up staleness (#30)", () => {
  it("flags applied with no response after 7 days", () => {
    expect(followUpDays(app(), NOW)).toBe(10);
    expect(needsFollowUp(app(), NOW)).toBe(true);
  });

  it("does not flag applied younger than 7 days", () => {
    const fresh = app({ dateApplied: new Date(NOW - 3 * DAY).toISOString() });
    expect(followUpDays(fresh, NOW)).toBeNull();
    expect(needsFollowUp(fresh, NOW)).toBe(false);
  });

  it("exactly 7 days flags (>= window)", () => {
    expect(
      followUpDays(app({ dateApplied: new Date(NOW - 7 * DAY).toISOString() }), NOW)
    ).toBe(7);
  });

  it("never flags applied once a response exists (any recency)", () => {
    const responded = app({ respondedAt: new Date(NOW - 1 * DAY).toISOString() });
    expect(needsFollowUp(responded, NOW)).toBe(false);
  });

  it("applies the same 7-day rule to screening", () => {
    const s = app({ status: "screening", dateApplied: new Date(NOW - 9 * DAY).toISOString() });
    expect(needsFollowUp(s, NOW)).toBe(true);
  });

  it("flags ghosted after 3 days using updatedAt as the ghosting date", () => {
    const ghosted = app({
      status: "ghosted",
      dateApplied: new Date(NOW - 40 * DAY).toISOString(),
      updatedAt: new Date(NOW - 4 * DAY).toISOString(),
    });
    expect(followUpDays(ghosted, NOW)).toBe(4);
    expect(needsFollowUp(ghosted, NOW)).toBe(true);
  });

  it("does not flag recently-ghosted applications", () => {
    const ghosted = app({
      status: "ghosted",
      updatedAt: new Date(NOW - 1 * DAY).toISOString(),
    });
    expect(needsFollowUp(ghosted, NOW)).toBe(false);
  });

  it("never flags interview/offer/rejected", () => {
    for (const status of ["interview", "offer", "rejected"] as const) {
      expect(
        needsFollowUp(
          app({ status, dateApplied: new Date(NOW - 30 * DAY).toISOString() }),
          NOW
        )
      ).toBe(false);
    }
  });
});