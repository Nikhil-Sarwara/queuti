# Queuti — Build Plan (v1)

## Vision
Track every job application, learn from real data, and provide market intelligence —
all in one skeuomorphic, tactile web app. Built by autonomous agents, one task at a time.

## Non-negotiables
1. **Skeuomorphism UI/UX** — realistic textures, bevels, shadows, tactile buttons (leather/wood
   /paper aesthetic or polished "physical dashboard"). No flat design. Realistic depth everywhere.
2. **Browser-based ML** — Transformers.js / WebLLM in the client. NO API keys, NO server ML.
3. **Everything lives on GitHub** (repo: Nikhil-Sarwara/queuti) — agents use issues as the queue.
4. **Never block** — stuck on a feature? Stop, write the solution sketch + why it failed into the
   issue, move to the next open task. Another agent picks it up later.
5. **Real data** — import from ~/.openclaw/workspace/jobhunt-applications.csv (existing job hunt).

## Architecture
- **Frontend/API:** Next.js 14+ (App Router), TypeScript, Tailwind (skeuomorphic theme layer)
- **DB:** MongoDB Atlas (cluster0.oyr9eud.mongodb.net) — collections: applications, events,
  contacts, companies, users
- **Cache/Queue:** Upstash Redis (mutual-mule-112620.upstash.io:6379, TLS)
- **ML:** client-side Transformers.js (job-score classifier, role-fit recommender)
- **Deploy:** Vercel, domain queuti.com (subdomain TBD), env vars for MONGO_URI + UPSTASH_REDIS

## Credentials (use from env, NEVER commit)
- MONGO_URI, UPSTASH_REDIS_URL — provided by owner; keep in .env.local / Vercel env, never in git.

## Task Queue Protocol (agents MUST follow)
1. `git pull` → read PLAN.md + TASKS.md + open issues.
2. Pick the highest-priority issue with label `todo` (or earliest in TASKS.md).
3. Do ONE task per run. Implement, test locally if possible, commit+push with a clear message.
4. Update the issue: close it if done (`done` label) or comment progress.
5. If a feature resists after reasonable effort (~20-30 min): leave it, write a "SOLUTION SKETCH +
   WHY IT FAILED" comment on the issue, label `blocked`, move to the next task. NEVER loop forever.
6. Final Discord reply = short status update (it is auto-posted to #study-projects).
7. Use `sessions_spawn` for parallelizable sub-tasks ONLY when it speeds things up.

## Phases (issue milestones)
1. Scaffold + skeuomorphic design system (theme tokens, buttons, cards)
2. MongoDB models + connection layer (env-config, healthcheck)
3. Auth (email/password, JWT, protected routes)
4. Application tracker (Kanban CRUD: apply → screening → interview → offer/reject/ghost)
5. CSV import (jobhunt-applications.csv format)
6. Analytics dashboard (funnel, response-time, source performance)
7. Redis layer (rate-limit/cache/queue; healthcheck)
8. Browser ML: job-score classifier + role-fit recommender (Transformers.js)
9. Tests (unit + e2e) + GitHub Actions CI
10. Deploy to Vercel + DNS + env; final smoke test
