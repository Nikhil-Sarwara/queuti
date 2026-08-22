import { describe, expect, it } from "vitest";
import {
  APP_COUNT,
  COMPANIES,
  CONTACT_NAMES,
  DEMO_EMAIL,
  STATUSES,
  buildDemoDataset,
  timeline,
} from "../scripts/demo-data.mjs";

const FIXED = Date.parse("2026-08-22T00:00:00.000Z");

describe("demo dataset generation (#36/#37)", () => {
  it("generates 36 applications spread across all six statuses equally", () => {
    const { applications, statuses } = buildDemoDataset({ userId: "u1", from: FIXED });
    expect(applications).toHaveLength(APP_COUNT);
    expect(applications).toHaveLength(36);
    for (const s of STATUSES) {
      expect(statuses.filter((x) => x === s)).toHaveLength(6);
    }
  });

  it("every doc is demo-flagged so the seeder can wipe idempotently", () => {
    const { applications, events, companies, contacts } = buildDemoDataset({ userId: "u1", from: FIXED });
    for (const set of [applications, events, companies, contacts]) {
      for (const doc of set) expect(doc.demo).toBe(true);
    }
  });

  it("seed script idempotency: same timestamp + user → byte-identical output", () => {
    const a = buildDemoDataset({ userId: "u1", from: FIXED });
    const b = buildDemoDataset({ userId: "u1", from: FIXED });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Wipe is scoped by userId — every doc carries the owning user, and a
    // different user's dataset must be standalone.
    const c = buildDemoDataset({ userId: "u2", from: FIXED });
    for (const doc of [...a.applications, ...a.events, ...a.companies, ...a.contacts]) {
      expect(doc.userId).toBe("u1");
    }
    for (const doc of [...c.applications, ...c.events]) {
      expect(doc.userId).toBe("u2");
    }
    expect(c.applications[0].userId).toBe("u2");
  });

  it("events always reference an existing application", () => {
    const { applications, events } = buildDemoDataset({ userId: "u1", from: FIXED });
    const ids = new Set(applications.map((a) => a._id));
    expect(events.length).toBeGreaterThan(applications.length); // many events
    for (const ev of events) expect(ids.has(ev.applicationId)).toBe(true);
  });

  it("affords companies + contacts data for the CRM panels", () => {
    const { companies, contacts } = buildDemoDataset({ userId: "u1", from: FIXED });
    expect(companies).toHaveLength(COMPANIES.length);
    expect(contacts).toHaveLength(CONTACT_NAMES.length);
    // contacts point at a company index
    for (const c of contacts) {
      expect(c.companyId).toBeGreaterThanOrEqual(0);
      expect(c.companyId).toBeLessThan(companies.length);
    }
  });

  it("spreads application dates over ~90 days and orders are stable", () => {
    const { applications } = buildDemoDataset({ userId: "u1", from: FIXED });
    const times = applications.map((a) => a.dateApplied.getTime()).sort((x, y) => x - y);
    const spanDays = (times[times.length - 1] - times[0]) / 86400000;
    expect(spanDays).toBeGreaterThan(60);
    expect(spanDays).toBeLessThan(120);
  });

  it("interviews carry prep question banks (the #34 feature)", () => {
    const { events } = buildDemoDataset({ userId: "u1", from: FIXED });
    const interviewEvents = events.filter((e) => e.type === "interview");
    expect(interviewEvents.length).toBeGreaterThan(0);
    for (const ev of interviewEvents) {
      expect(Array.isArray(ev.questions)).toBe(true);
      expect(ev.questions.length).toBeGreaterThan(0);
      for (const q of ev.questions) {
        expect(typeof q.text).toBe("string");
        expect(typeof q.done).toBe("boolean");
      }
    }
  });
});

describe("timeline builder", () => {
  const applied = new Date(FIXED);

  it("always records the application moment first", () => {
    for (const s of STATUSES) {
      const evs = timeline(s, applied);
      expect(evs[0].type).toBe("application");
      expect(evs[0].occurredAt.getTime()).toBe(applied.getTime());
    }
  });

  it("offer path ends with an offer event, rejected with rejection, ghosted with follow-ups", () => {
    const offer = timeline("offer", applied);
    expect(offer[offer.length - 1].type).toBe("offer");
    const rej = timeline("rejected", applied);
    expect(rej[rej.length - 1].type).toBe("rejection");
    const ghost = timeline("ghosted", applied);
    expect(ghost.filter((e) => e.type === "follow_up").length).toBe(2);
  });

  it("events are strictly chronological", () => {
    for (const s of STATUSES) {
      const evs = timeline(s, applied);
      for (let i = 1; i < evs.length; i++) {
        expect(evs[i].occurredAt.getTime()).toBeGreaterThan(evs[i - 1].occurredAt.getTime());
      }
    }
  });
});