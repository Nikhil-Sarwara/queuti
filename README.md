# Queuti 🦉

Personal job-application tracker + **market intelligence** platform — a
skeuomorphic, tactile web app that tracks every application, learns from
real data, and tells you how the market is treating you.

**Stack:** Next.js 14 (App Router, TypeScript, Tailwind) · MongoDB Atlas ·
Upstash Redis · browser-based ML (Transformers.js) · Vercel
**UI/UX:** Skeuomorphism — realistic materials, bevels, shadows, tactile
buttons (leather / wood / brass / paper). No flat design.

Built incrementally by autonomous build agents (see `PLAN.md` and GitHub
issues for the task queue).

## Features

- **Overview dashboard** — live stat cards: total applications, active
  pipeline, interviews, offers, avg response days, response rate
- **Kanban tracker** — 6-stage board (applied → screening → interview →
  offer / rejected / ghosted) with ← → status moves, and a paper **ledger**
  table view with search, status/date filters and sorting
- **Advanced board filters** — hide/show stage columns, company search,
  date range, sort by applied or updated
- **Application detail page** — status stepper, **stage-history timeline**
  (events auto-recorded on every move; add follow-ups/notes), notes +
  job-description editor, linked company & contacts
- **Companies & contacts** — full CRUD, linked to applications with live
  application counts
- **Upcoming interviews** — events in the next 14 days as a dated card list
- **Analytics** — funnel by stage, avg response days, source performance
- **Market intelligence** (`/stats`) — charts (recharts): applications by
  company / source / role, avg response days per source
- **CSV import & export** — drag-and-drop import with template download and
  per-row validation errors; export your data back to CSV
- **Browser ML, no servers, no API keys** — Transformers.js (quantized MNLI,
  ~25 MB, cached after first download) powers a role-fit recommender and a
  per-application **role-fit score** badge
- **Auth** — email/password (bcrypt), JWT sessions, protected routes
- **PWA-ready** — manifest, custom 404 + error boundary, OG meta,
  robots.txt + sitemap

## Architecture

```
/                 → public landing (shows live overview when signed in)
/dashboard        → protected: kanban + ledger, upcoming, analytics,
                    companies/contacts, ML panel
/applications/[id]→ detail: timeline, notes/JD, role-fit score
/stats            → market intelligence charts
/api/…            → ownership-scoped REST routes (applications, events,
                    companies, contacts, analytics, market, auth, health,
                    import, export)
lib/models.ts     → typed Mongo accessors + indexes (users, applications,
                    events, contacts, companies)
lib/redis.ts      → Upstash cache-aside (analytics, 30 s TTL) + healthcheck
lib/ml.ts         → client-side Transformers.js pipelines
```

## Environment setup

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string (collections auto-created) |
| `UPSTASH_REDIS_URL` | ⚠️ | Upstash Redis REST URL — optional; app falls back to uncached Mongo |
| `AUTH_SECRET` | ⚠️ | JWT signing secret — defaults to a dev value in local |

> Never commit real credentials. `.env*` is gitignored; only `.env.example`
> is tracked.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Register an account at `/login` → **Register**, then import your job hunt:

1. Open the **CSV import & export** drawer on `/dashboard`
2. Download the **template CSV**, fill it (`date,title,company,apply_url,hiring_email`)
   — or just drag in your existing `jobhunt-applications.csv`
3. Duplicates (same title + company + date) are skipped automatically

## Test & build

```bash
npm test             # vitest (18 unit tests: auth, csv, ml helpers)
npm run build        # production build (must pass before committing)
npm run lint
```

## Browser ML notes

The role-fit scorer runs entirely in the browser. On first use the page
downloads the ~25 MB quantized MNLI model (cached afterwards). Paste a
job description on an application's detail page and save — the card and
detail page then show `🎯 N% Role` badges.

## Screenshots

_Placeholder — add captures of the dashboard, ledger view, application
detail and the stats page here as they become available._

## Project status

Core product complete (phases 1–2, issues 1–23). Remaining hardening in
the GitHub issue queue: auth hardening, API hardening, data-quality UX.
See `TASKS.md` and `CONTRIBUTING.md`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the agent workflow, and
[PLAN.md](./PLAN.md) for the vision and non-negotiables (skeuomorphism
UI is a hard requirement).