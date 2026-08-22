/**
 * Demo dataset generation (#36/#37) — pure, side-effect-free.
 *
 * Shared by:
 *  - scripts/seed.mjs  → inserts the generated docs into MongoDB
 *  - tests/demo-data.test.ts → verifies distribution + idempotency
 *
 * Generates 36 applications (6 per status), 114 timeline events (incl.
 * interview-prep question banks), 10 companies, 20 contacts for the demo
 * user. Every doc carries `demo: true` so the seeder can wipe-and-reinsert
 * without touching real data.
 */

export const DEMO_EMAIL = "demo@queuti.com";
export const DEMO_PASSWORD = "demo1234";
export const STATUSES = ["applied", "screening", "interview", "offer", "rejected", "ghosted"];
export const APP_COUNT = 36;

const daysAgo = (n, from = Date.now()) => new Date(from - n * 86400000 + 9 * 3600000);

export function timeline(status, applied) {
  const evs = [];
  const at = (offsetDays, type, note, questions, prepNote) =>
    evs.push({
      type,
      occurredAt: new Date(applied.getTime() + offsetDays * 86400000),
      note,
      questions,
      prepNote,
    });
  at(0, "application", "Application submitted.");
  switch (status) {
    case "applied":
      break;
    case "screening":
      at(3, "screening", "Recruiter phone screen — asked about notice period and salary range.");
      break;
    case "interview":
      at(6, "screening", "Phone screen with recruiter, went well.");
      at(11, "interview", "Technical interview — system design + coding round.",
        [{ text: "Describe a distributed cache you've built", done: true },
         { text: "How do you design for high availability?", done: true },
         { text: "SQL vs NoSQL trade-offs for this product", done: false }],
        "Team seems pragmatic. They care about observability. Prepare a concrete incident story.");
      break;
    case "offer":
      at(6, "screening", "Screening call, positive.");
      at(12, "interview", "Panel interview with team lead + 2 engineers.",
        [{ text: "Walk through your most complex debugging session", done: true },
         { text: "How do you scope a 2-week project?", done: true }],
        "Ask about on-call rotation and growth path.");
      at(18, "interview", "Final round with VP Engineering — culture fit + architecture chat.",
        [{ text: "How do you handle technical disagreement?", done: true }]);
      at(22, "offer", "Offer received — competitive base + equity, negotiating start date.");
      break;
    case "rejected":
      at(5, "screening", "Recruiter call.");
      at(9, "interview", "Take-home review + technical interview.",
        [{ text: "Explain your take-home architecture choices", done: true }]);
      at(15, "rejection", "Rejected — they went with a stronger systems background. Ask for feedback.");
      break;
    case "ghosted":
      at(4, "screening", "Recruiter screen.");
      at(14, "follow_up", "Follow-up email sent — no reply.");
      at(28, "follow_up", "Second follow-up. Radio silence — marking as ghosted.");
      break;
  }
  return evs;
}

export const COMPANIES = [
  ["Acme Corp", "https://acme.com", "SaaS", "Remote (US)"],
  ["Northwind Labs", "https://northwind.dev", "Developer tools", "Sydney, AU"],
  ["Globex Industries", "https://globex.io", "Logistics", "Melbourne, AU"],
  ["Initech Software", "https://initech.dev", "Fintech", "Remote (Global)"],
  ["Umbrella Analytics", "https://umbrella.ai", "AI / Data", "Sydney, AU"],
  ["Wayne Enterprises", "https://wayne.tech", "Infrastructure", "New York, US"],
  ["Stark Dynamics", "https://starkdev.com", "Consumer apps", "Remote (US)"],
  ["Hooli Cloud", "https://hooli.cloud", "Cloud platform", "San Francisco, US"],
  ["Vandelay Consulting", "https://vandelay.co", "Consulting", "Brisbane, AU"],
  ["Pied Piper Systems", "https://piedpiper.systems", "Compression / ML", "Austin, US"],
];

export const CONTACT_NAMES = [
  ["Sarah Chen", "Senior Recruiter"], ["Marcus Webb", "Hiring Manager"],
  ["Priya Natarajan", "Talent Partner"], ["Tom O'Brien", "Engineering Manager"],
  ["Elena Rodriguez", "Recruiter"], ["David Kim", "CTO"],
  ["Aisha Patel", "People Ops"], ["James Foster", "Staff Engineer"],
  ["Grace Liu", "Recruiter"], ["Oliver Smith", "VP Engineering"],
  ["Nina Kowalski", "Talent Lead"], ["Liam Murphy", "Tech Lead"],
  ["Zoe Williams", "HR Business Partner"], ["Andre Silva", "Founder"],
  ["Hannah Lee", "Recruiter"], ["Ryan Cole", "Senior Engineer"],
  ["Maya Sharma", "Head of Talent"], ["Ben Carter", "Director of Eng"],
  ["Sofia Rossi", "Recruiter"], ["Chris Evans", "Product Lead"],
];

const ROLES = [
  "Senior Full-Stack Engineer", "Backend Engineer", "Frontend Engineer",
  "DevOps Engineer", "Data Engineer", "Product Engineer",
  "Staff Software Engineer", "ML Engineer", "Platform Engineer", "Solutions Engineer",
];

const SOURCES = ["linkedin", "seek", "direct", "referral", "hackernews", "werk", "company site"];
const SALARIES = ["$140k", "$155k", "$120k + equity", "$165k", "$110k", "$175k", "$150k + bonus", "$130k", "$145k", "$160k + equity"];
const JDS = [
  "We're looking for a senior engineer to own our core API platform. You'll design resilient services, mentor 2-3 engineers, and drive architecture decisions. Stack: TypeScript, Node.js, Postgres, AWS. 5+ years experience required.",
  "Join our data team building real-time pipelines powering product analytics. Strong SQL, Python, and stream-processing experience (Kafka/Flink) needed. dbt + Snowflake a plus.",
  "We build developer tools used by 40k teams. Frontend focus: React, TypeScript, and a love for polished UX. You'll own features end-to-end with a small senior team.",
  "Own our cloud infrastructure: Kubernetes, Terraform, CI/CD, and cost optimization. Incident response experience and strong Linux fundamentals required.",
  "Full-stack product engineer for our mobile-first consumer app. React Native + Node. Fast iteration, A/B testing, and direct customer feedback loops.",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

/**
 * Build the full showcase dataset (no DB writes).
 * Returns { uid, applications, statuses, events, companies, contacts } where
 * applications carry placeholder `_id`s (new ObjectId) so events can
 * reference them. Deterministic for a fixed `from` timestamp — idempotent.
 */
export function buildDemoDataset({ userId, from = Date.now() } = {}) {
  const now = new Date(from);
  const uid = userId ?? "DEMO-USER-ID";

  const companies = COMPANIES.map(([name, website, industry, location], i) => ({
    userId: uid, name, website, industry, location,
    notes: pick(["Met the team at a meetup — they're hiring aggressively.", "Referral from former colleague.", "Cold outreach via email; response rate decent.", "", ""], i),
    demo: true, createdAt: now, updatedAt: now,
  }));

  const contacts = CONTACT_NAMES.map(([name, role], i) => ({
    userId: uid, name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${COMPANIES[i % COMPANIES.length][1].replace("https://", "").split(".")[0]}.com`,
    phone: `+1 555-01${String(10 + (i % 90)).padStart(2, "0")}`,
    companyId: i % companies.length,
    notes: `${role} at ${COMPANIES[i % COMPANIES.length][0]}.`,
    demo: true, createdAt: now, updatedAt: now,
  }));

  const statusCycle = Array.from({ length: APP_COUNT }, (_, i) => STATUSES[i % STATUSES.length]);
  const applications = statusCycle.map((status, i) => {
    const company = COMPANIES[i % COMPANIES.length];
    const applied = daysAgo(Math.round(i * 2.4 + (i % 5)), from);
    const statusIdx = STATUSES.indexOf(status);
    const respondedAfter = status === "applied" ? undefined : 2 + (i % 6);
    return {
      _id: `app-${i}`,
      userId: uid,
      companyId: i % companies.length,
      title: pick(ROLES, i),
      companyName: company[0],
      applyUrl: `${company[1]}/careers/${i}`,
      hiringEmail: `jobs@${company[1].replace("https://", "").split(".")[0]}.com`,
      source: pick(SOURCES, i),
      status,
      dateApplied: applied,
      respondedAt: respondedAfter ? new Date(applied.getTime() + respondedAfter * 86400000) : undefined,
      salary: i % 3 === 0 ? pick(SALARIES, i) : undefined,
      notes: pick(["Strong referral from Sarah.", "Cover letter tailored to their stack.", "", "Portfolio link included.", "Startup — moving fast, 3 rounds in a week."], i),
      jd: i % 2 === 0 ? pick(JDS, i) : undefined,
      demo: true,
      createdAt: applied,
      updatedAt: new Date(applied.getTime() + (statusIdx + 1) * 86400000),
    };
  });

  const events = [];
  for (let i = 0; i < applications.length; i++) {
    for (const ev of timeline(statusCycle[i], applications[i].dateApplied)) {
      events.push({
        userId: uid,
        applicationId: applications[i]._id,
        type: ev.type,
        occurredAt: ev.occurredAt,
        note: ev.note,
        questions: ev.questions,
        prepNote: ev.prepNote,
        demo: true,
        createdAt: ev.occurredAt,
      });
    }
  }

  return {
    userId: uid,
    statuses: statusCycle,
    applications,
    events,
    companies,
    contacts,
  };
}