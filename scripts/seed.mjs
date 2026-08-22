/**
 * Demo data seed (#36) — `npm run seed`
 *
 * Inserts a realistic showcase dataset for the demo user
 *   demo@queuti.com / demo1234
 * (upserted; password re-hashed on every run so it always works).
 *
 * Idempotent: every seeded doc carries `demo: true`; on start we delete ONLY
 * docs flagged `demo` for this user, then re-insert fresh. Real user data is
 * never touched. Run any time — safe.
 *
 * Requires MONGO_URI (reads .env.local if present, else env).
 * Verifies: run, then open /dashboard — kanban, ledger, analytics, upcoming
 * interviews and market panel will all be populated.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

// ---- env: prefer real env, fall back to .env.local (parsed manually so the
// ---- script has zero extra deps beyond the app's own mongodb/bcryptjs).
const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, "..", ".env.local");
function loadEnvLocal() {
  if (!existsSync(envLocal)) return {};
  const out = {};
  for (const raw of readFileSync(envLocal, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}
const uri = process.env.MONGO_URI || loadEnvLocal().MONGO_URI;
if (!uri) {
  console.error("❌ MONGO_URI is not set. Add it to .env.local (gitignored) or export it, then re-run: npm run seed");
  process.exit(1);
}

const DEMO_EMAIL = "demo@queuti.com";
const DEMO_PASSWORD = "demo1234";
const DB_NAME = process.env.MONGODB_DB || "queuti";

const daysAgo = (n) => new Date(Date.now() - n * 86400000 + 9 * 3600000);

/** Status progression timeline for a single application. */
function timeline(status, applied) {
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

const COMPANIES = [
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

const contactNames = [
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

async function main() {
  const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(DB_NAME);
  const users = db.collection("users");
  const apps = db.collection("applications");
  const events = db.collection("events");
  const companies = db.collection("companies");
  const contacts = db.collection("contacts");

  // 1. Demo user (upsert).
  const now = new Date();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let user = await users.findOne({ email: DEMO_EMAIL });
  if (user) {
    await users.updateOne({ _id: user._id }, { $set: { passwordHash, updatedAt: now, demo: true } });
  } else {
    const res = await users.insertOne({
      email: DEMO_EMAIL, passwordHash, name: "Demo Candidate",
      demo: true, createdAt: now, updatedAt: now,
    });
    user = { _id: res.insertedId, email: DEMO_EMAIL, passwordHash, name: "Demo Candidate", createdAt: now, updatedAt: now };
  }
  const uid = user._id;

  // 2. Idempotent wipe: delete ONLY demo-flagged docs for this user.
  const [cApp, cEvt, cCmp, cCtc] = await Promise.all([
    apps.deleteMany({ userId: uid, demo: true }),
    events.deleteMany({ userId: uid, demo: true }),
    companies.deleteMany({ userId: uid, demo: true }),
    contacts.deleteMany({ userId: uid, demo: true }),
  ]);
  console.log(`🧹 Wiped previous demo data: ${cApp.deletedCount} apps, ${cEvt.deletedCount} events, ${cCmp.deletedCount} companies, ${cCtc.deletedCount} contacts`);

  // 3. Companies.
  const companyIds = [];
  for (let i = 0; i < COMPANIES.length; i++) {
    const [name, website, industry, location] = COMPANIES[i];
    const res = await companies.insertOne({
      userId: uid, name, website, industry, location,
      notes: pick(["Met the team at a meetup — they're hiring aggressively.", "Referral from former colleague.", "Cold outreach via email; response rate decent.", "", ""], i),
      demo: true, createdAt: now, updatedAt: now,
    });
    companyIds.push(res.insertedId);
  }

  // 4. Contacts.
  for (let i = 0; i < contactNames.length; i++) {
    const [name, role] = contactNames[i];
    const cid = companyIds[i % companyIds.length];
    await contacts.insertOne({
      userId: uid, name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${COMPANIES[i % COMPANIES.length][1].replace("https://", "").split(".")[0]}.com`,
      phone: `+1 555-01${String(10 + (i % 90)).padStart(2, "0")}`,
      companyId: cid,
      notes: `${role} at ${COMPANIES[i % COMPANIES.length][0]}.`,
      demo: true, createdAt: now, updatedAt: now,
    });
  }

  // 5. 36 applications across all six statuses, spread over ~90 days.
  const statuses = ["applied", "screening", "interview", "offer", "rejected", "ghosted"];
  const statusCycle = Array.from({ length: 36 }, (_, i) => statuses[i % statuses.length]);
  const appDocs = [];

  for (let i = 0; i < statusCycle.length; i++) {
    const status = statusCycle[i];
    const company = COMPANIES[i % COMPANIES.length];
    const cid = companyIds[i % companyIds.length];
    const applied = daysAgo(Math.round(i * 2.4 + (i % 5)));
    const statusIdx = statuses.indexOf(status);
    const respondedAfter = status === "applied" ? undefined : 2 + (i % 6);
    appDocs.push({
      userId: uid,
      companyId: cid,
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
    });
  }

  const inserted = await apps.insertMany(appDocs.map((d) => ({ ...d, demo: true })));
  const ids = Object.values(inserted.insertedIds);

  let evtCount = 0;
  for (let i = 0; i < appDocs.length; i++) {
    for (const ev of timeline(statusCycle[i], appDocs[i].dateApplied)) {
      await events.insertOne({
        userId: uid, applicationId: ids[i], type: ev.type, occurredAt: ev.occurredAt,
        note: ev.note, questions: ev.questions, prepNote: ev.prepNote,
        demo: true, createdAt: ev.occurredAt,
      });
      evtCount++;
    }
  }

  const byStatus = statusCycle.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  console.log(`✅ Seeded ${appDocs.length} applications (${Object.entries(byStatus).map(([s, n]) => `${s}: ${n}`).join(", ")})`);
  console.log(`✅ Seeded ${evtCount} timeline events, ${COMPANIES.length} companies, ${contactNames.length} contacts`);
  console.log(`\n👤 Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("Open /dashboard — kanban, ledger, analytics, upcoming interviews and market panel are populated.");
  await client.close();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});