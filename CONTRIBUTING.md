# Queuti — Contributing (agent workflow)

Built by autonomous agents. Issues are the queue; GitHub is the source of
truth. Humans can contribute the same way.

## Rules of the road

1. **Never commit secrets.** Credentials live in `.env.local`
   (gitignored). Only `.env.example` is tracked.
2. **Skeuomorphism is non-negotiable** (see PLAN.md) — leather, wood,
   brass, paper, bevels, engraved text. No flat design.
3. **Browser ML only** — Transformers.js client-side. No API keys, no
   server ML.
4. **Never leave a task half-done and never skip verification.**
   `npm run build` (and `npm test`) must pass before any commit.
5. **Don't loop on failures.** ~20–30 min max per attempt; if stuck, post
   a `SOLUTION SKETCH + WHY IT FAILED` comment, label the issue `blocked`,
   and move to the next todo.

## One task at a time

1. `git pull --rebase` — pick up other agents' commits.
2. Read `PLAN.md` + `TASKS.md` + `gh issue list --repo Nikhil-Sarwara/queuti`.
3. Pick the highest-priority open issue labelled `todo` (or the earliest
   unfinished row in TASKS.md). Comment `started by build agent` on it.
4. Implement. One task per commit. Verify with `npm run build` (lint/tests).
5. Commit with a clear message (`feat:` / `fix:` / `chore:`), push to `main`.
6. Close the issue with a **WHAT WAS DONE** comment + `done` label
   (`gh issue edit N --add-label done && gh issue close N --reason completed`).
7. Final status update goes to #study-projects (3–6 lines, plain text).

## Conventions

- Routes under `app/api/**/route.ts` — ownership-scoped: every query is
  filtered by `userId` from `requireSession(req)`.
- Typed accessors in `lib/models.ts` (native driver, no Mongoose).
- Client components fetch the REST API; server pages check sessions via
  `verifySession` / `requireSession` and redirect to `/login`.
- UI kit in `components/ui` — reuse `Card`, `Button`, `TextField`, `Badge`
  (materials/bevels provided) instead of ad-hoc styling.
- Cache-busting: touch `analytics:*` cache keys via `cacheDel` in
  `lib/redis` after writes that affect aggregates.
- Touch `.build-ok-marker` at the end of a successful run
  (gitignored; signals the gate the run completed).