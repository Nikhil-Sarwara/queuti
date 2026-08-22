import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";

/**
 * Public landing page (#39) — product showcase. Skeuomorphic throughout:
 * leather masthead, wood desk panels, brass CTAs, paper feature cards.
 */
export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ---- masthead ---- */}
      <header className="border-b border-ink/15 bg-gradient-to-b from-wood-light/60 via-wood/40 to-transparent">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-xl font-bold text-ink text-embossed">
            Queuti <span className="text-leather-600">🦉</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md border-2 border-b-4 border-paper-dark bg-gradient-to-b from-paper-light to-paper px-4 py-1.5 text-sm font-semibold text-ink shadow-bevel-sm transition active:translate-y-px active:border-b-2"
            >
              Sign in
            </Link>
            <Link
              href="/login?mode=register"
              className="rounded-md border-2 border-b-4 border-brass-dark bg-gradient-to-b from-brass-light to-brass px-4 py-1.5 text-sm font-semibold text-ink shadow-bevel-sm transition active:translate-y-px active:border-b-2"
            >
              Get started
            </Link>
          </div>
        </nav>

        <div className="mx-auto max-w-5xl px-6 pb-14 pt-12 text-center">
          <Badge tone="applied" dot className="mx-auto">
            Your job hunt, on one leather-bound desk
          </Badge>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-4xl font-bold leading-tight text-ink text-embossed sm:text-5xl">
            Track every application.
            <br />
            <span className="text-brass-dark">Learn from real data.</span> Know the market.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ink-soft sm:text-base">
            Queuti is a tactile, skeuomorphic job tracker — kanban board,
            analytics that actually explain your funnel, market intelligence,
            and a browser-side AI role-fit scorer. No flat design, no spam.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login?mode=register">
              <Button variant="brass" size="lg">
                ✒️ Start tracking — free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="paper" size="lg">
                I already have an account
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-ink-faint">
            Import your existing CSV in one drag-and-drop
          </p>
        </div>
      </header>

      {/* ---- mock preview (screenshot-style, pure CSS) ---- */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="relative rounded-lg border-2 border-b-4 border-wood-dark/60 bg-gradient-to-b from-paper-light to-paper shadow-bevel-lg">
          <div className="flex items-center gap-1.5 border-b border-ink/15 px-4 py-2.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-blood" />
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brass" />
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-moss" />
            <span className="ml-3 truncate text-[11px] font-semibold text-ink-faint">
              queuti.com/dashboard
            </span>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <div className="rounded-md border border-ink/20 bg-paper-dark/60 p-3 shadow-engraved">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">
                  Kanban tracker
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["applied", "interview", "offer"] as const).map((s, i) => (
                    <div key={s} className="space-y-1.5">
                      <Badge tone={s} className="!text-[9px]">
                        {s[0].toUpperCase() + s.slice(1)}
                      </Badge>
                      {[0, 1].map((j) => (
                        <div
                          key={j}
                          className="rounded-sm border border-ink/10 bg-paper-light/70 p-1.5 shadow-bevel-sm"
                        >
                          <p className="truncate text-[9px] font-bold text-ink">
                            {["Senior Engineer", "Backend Dev", "ML Engineer", "Frontend"][i + j]}
                          </p>
                          <p className="truncate text-[8px] opacity-60">
                            {["Acme", "Northwind", "Globex", "Initech"][i + j]}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-md border border-brass/40 bg-brass/10 p-3 shadow-bevel-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brass-dark">
                  🎯 Role-fit score
                </p>
                <p className="mt-1 text-lg font-bold text-ink">87/100</p>
                <p className="text-[9px] opacity-70">
                  Scored in your browser — no data leaves the machine
                </p>
              </div>
              <div className="rounded-md border border-moss/40 bg-moss/10 p-3 shadow-bevel-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-moss-dark">
                  📈 Funnel insights
                </p>
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-brass-light to-brass" style={{ width: "100%" }} />
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-leather-400 to-leather-600" style={{ width: "70%" }} />
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-moss-light to-moss" style={{ width: "45%" }} />
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-blood-light to-blood" style={{ width: "20%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- feature grid ---- */}
      <section className="mx-auto max-w-5xl px-6 pb-14">
        <h2 className="text-center font-display text-2xl font-bold text-engraved text-ink">
          Everything a job hunt needs, in one place
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🗂️",
              title: "Kanban tracker",
              body: "Six stages — applied → ghosted — with drag-free move buttons, filters, bulk actions and a searchable ledger view.",
              tone: "brass" as const,
            },
            {
              icon: "📈",
              title: "Analytics",
              body: "Funnel conversion, average response days, offer rate by source. Your hunt, quantified.",
              tone: "moss" as const,
            },
            {
              icon: "🌍",
              title: "Market intel",
              body: "Salary benchmarks and role demand across your applications, updated from real data.",
              tone: "leather" as const,
            },
            {
              icon: "🧠",
              title: "AI role-fit",
              body: "Transformers.js scores job descriptions in your browser. No API keys, no server, no uploads.",
              tone: "brass" as const,
            },
          ].map((f) => (
            <Card key={f.title} material="paper" framed className="shadow-bevel-sm">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-base shadow-bevel-sm ${
                  f.tone === "brass"
                    ? "border-brass-dark/50 bg-gradient-to-b from-brass-light to-brass"
                    : f.tone === "moss"
                      ? "border-moss-dark/50 bg-gradient-to-b from-moss-light to-moss"
                      : "border-leather-700/50 bg-gradient-to-b from-leather-400 to-leather-600"
                }`}
              >
                <span aria-hidden>{f.icon}</span>
              </div>
              <h3 className="mt-3 font-display text-base font-bold text-ink">{f.title}</h3>
              <p className="mt-1 text-xs text-ink-soft">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- smaller perks ---- */}
      <section className="mx-auto max-w-5xl px-6 pb-14">
        <Card material="wood" framed className="shadow-bevel">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              ["📥", "CSV import & export", "Drag in your existing spreadsheet — duplicates flagged, nothing lost."],
              ["⏰", "Follow-up reminders", "Know exactly which applications went quiet and when to nudge."],
              ["🎯", "Interview prep", "Question banks and prep notes per interview, checked off as you go."],
              ["🖤", "Pure skeuomorphism", "Leather, brass, wood and paper. No flat design, ever."],
              ["🔐", "Email verification", "Every account verified; sessions are 7-day sliding JWTs."],
              ["📱", "PWA-ready", "Install it on your phone — works offline, feels native."],
            ].map(([icon, title, body]) => (
              <div key={title}>
                <p className="text-lg" aria-hidden>{icon}</p>
                <h3 className="mt-1 text-sm font-bold text-ink">{title}</h3>
                <p className="mt-0.5 text-xs text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ---- final CTA ---- */}
      <section className="mx-auto max-w-5xl px-6 pb-16 text-center">
        <Card material="leather" framed className="shadow-bevel-lg">
          <h2 className="font-display text-2xl font-bold text-paper-light text-embossed">
            Your next role is in the data
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-paper-light/80">
            Import your hunt, get the numbers, walk into the next interview
            prepared. Free for your own tracker.
          </p>
          <Link href="/login?mode=register" className="mt-5 inline-block">
            <Button variant="brass" size="lg">
              ✒️ Create your tracker
            </Button>
          </Link>
        </Card>
      </section>

      <footer className="border-t border-ink/15 bg-paper-dark/40 py-6 text-center text-xs text-ink-faint">
        <p>
          Queuti — skeuomorphic job tracker · built by autonomous agents ·
          <Link href="/login" className="ml-1 underline underline-offset-2 hover:text-ink-soft">
            sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}