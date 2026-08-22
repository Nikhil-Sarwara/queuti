# Queuti — Task Backlog

Order matters. Agents pick the first task with status `todo`.

## Phase 1 — core (issues 1–11, all closed)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Scaffold Next.js app (App Router, TS, Tailwind) | done | 774ce26 |
| 2 | Skeuomorphic design system (theme tokens, buttons, cards, bevels) | done | 3a9a95a |
| 3 | MongoDB connection layer + models (users, applications, events, contacts, companies) | done | 9dafbb5 |
| 4 | Auth: email/password + JWT + protected routes | done | d60aa38 |
| 5 | Kanban tracker CRUD (status: applied/screening/interview/offer/rejected/ghosted) | done | 2c1d2cf |
| 6 | CSV import from jobhunt-applications.csv | done | 8104d5c |
| 7 | Analytics dashboard (funnel, avg response days, source performance) | done | acfc1c3 |
| 8 | Upstash Redis layer (healthcheck, cache, queue) | done | 31fcdb5 |
| 9 | Browser ML: job-score classifier + role-fit recommender (Transformers.js) | done | 9e0503e |
| 10 | Tests + GitHub Actions CI | done | 6a14f10 |
| 11 | Deploy Vercel + DNS + env, smoke test | done | — |

## Phase 2 — product depth (issues 12–26)

| Issue | Task | Status | Notes |
|---|------|--------|-------|
| 12 | Dashboard overview stats | done | OverviewStats on / and /dashboard |
| 13 | Applications list view (table) | done | Board/Ledger toggle + search/filter/sort |
| 14 | Company & contact management | done | CRUD UI + API, app counts per company |
| 15 | Application detail page + activity timeline | done | /applications/[id], events auto-recorded |
| 16 | Upcoming interviews view | done | /api/events 14-day window panel |
| 17 | Job description + role-fit score UI | done | matchRole() ML badge on card + detail |
| 18 | Market intelligence view | done | /stats + recharts + /api/analytics/market |
| 19 | CSV import UX + export | done | drag-drop, template, row errors, export |
| 20 | Kanban advanced filters | done | stage toggles, company search, date range, sort |
| 21 | Skeuomorphic polish pass | done | toasts, skeletons, empty states, focus states |
| 22 | Professional page polish + PWA | done | 404, error boundary, icon, manifest, robots/sitemap |
| 23 | Docs upgrade | done | README, .env.example, CONTRIBUTING, TASKS |
| 24 | Auth hardening | done | bc22792 — reset flow, sliding sessions, /account, CSRF-safe cookies |
| 25 | API hardening | done | 6d2848b — pagination/sort, validation, rate limits, security headers |
| 26 | Data quality UX | done | dup detection on import, archive/restore, bulk status |

## Queue protocol

1. `git pull` → read PLAN.md + TASKS.md + open issues
2. Pick highest-priority issue labelled `todo`; comment `started by build agent`
3. Implement, verify (`npm run build`), commit + push
4. Close with WHAT WAS DONE comment + `done` label; or `blocked` + solution sketch
5. Final reply = short status update (auto-posted to #study-projects)