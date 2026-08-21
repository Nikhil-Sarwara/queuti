# Queuti — Task Backlog

Order matters. Agents pick the first task with status `todo`.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Scaffold Next.js app (App Router, TS, Tailwind) | todo | `npx create-next-app@latest` in repo root |
| 2 | Skeuomorphic design system (theme tokens, buttons, cards, bevels) | todo | See PLAN.md §Non-negotiables |
| 3 | MongoDB connection layer + models (users, applications, events, contacts, companies) | todo | Use env vars |
| 4 | Auth: email/password + JWT + protected routes | todo | NextAuth or custom |
| 5 | Kanban tracker CRUD (status: applied/screening/interview/offer/rejected/ghosted) | todo | |
| 6 | CSV import from jobhunt-applications.csv | todo | date,title,company,apply_url,hiring_email |
| 7 | Analytics dashboard (funnel, avg response days, source performance) | todo | Aggregations via Mongo |
| 8 | Upstash Redis layer (healthcheck, cache, queue) | todo | TLS, env var |
| 9 | Browser ML: job-score classifier + role-fit recommender (Transformers.js) | todo | Client-side only |
| 10 | Tests + GitHub Actions CI | todo | |
| 11 | Deploy Vercel + DNS + env, smoke test | todo | Domain: queuti.com |
