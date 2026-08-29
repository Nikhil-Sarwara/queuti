import Link from "next/link";
import { Button, Card } from "@/components/ui";

/**
 * Public landing page — Warm Minimalism hero + bento feature grid.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="text-xl font-bold text-text-primary">
          Queuti <span className="text-accent">🦉</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/login?mode=register">
            <Button variant="primary" size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24">
        <p className="mb-3 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent">
          ✨ Your job hunt, beautifully organized
        </p>

        <h1 className="max-w-2xl font-bold leading-tight tracking-tight text-text-primary"
            style={{ fontSize: "clamp(2rem, 1.5rem + 2.5vw, 3.5rem)" }}>
          Track every application.
          <br />
          <span className="text-accent">Learn from real data.</span>{" "}
          Know the market.
        </h1>

        <p className="mt-5 max-w-lg text-sm leading-relaxed text-text-secondary sm:text-base">
          Queuti is a clean, modern job tracker — kanban board,
          analytics that explain your funnel, market intelligence,
          and a browser-side AI role-fit scorer.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login?mode=register">
            <Button variant="primary" size="lg">Start tracking — free</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">I already have an account</Button>
          </Link>
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-widest text-text-tertiary">
          Import your existing CSV in one drag-and-drop
        </p>
      </section>

      {/* ── Feature Bento Grid (3 cards) ── */}
      <section className="pb-20">
        <h2 className="mb-8 text-center font-bold tracking-tight text-text-primary"
            style={{ fontSize: "clamp(1.25rem, 1rem + 1vw, 1.75rem)" }}>
          Everything a job hunt needs
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Track */}
          <Card className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-lg text-accent">
              🗂️
            </div>
            <h3 className="text-lg font-bold text-text-primary">Track</h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Six stages — applied through ghosted — with move buttons,
              filters, bulk actions, and a searchable ledger view.
              Never lose sight of an opportunity.
            </p>
            <ul className="mt-1 space-y-1.5 text-xs text-text-tertiary">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-accent" />
                Kanban & table views
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-accent" />
                CSV import & export
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-accent" />
                Follow-up reminders
              </li>
            </ul>
          </Card>

          {/* Learn */}
          <Card className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-lg text-success">
              📈
            </div>
            <h3 className="text-lg font-bold text-text-primary">Learn</h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Funnel conversion rates, average response times, offer rate
              by source — your hunt, quantified so you can improve.
            </p>
            <ul className="mt-1 space-y-1.5 text-xs text-text-tertiary">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-success" />
                Funnel analytics
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-success" />
                Response time insights
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-success" />
                Source attribution
              </li>
            </ul>
          </Card>

          {/* Know */}
          <Card className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-lg text-info">
              🌍
            </div>
            <h3 className="text-lg font-bold text-text-primary">Know</h3>
            <p className="text-sm leading-relaxed text-text-secondary">
              Market intelligence from real data — salary benchmarks,
              role demand, and AI-powered role-fit scoring that runs
              entirely in your browser.
            </p>
            <ul className="mt-1 space-y-1.5 text-xs text-text-tertiary">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-info" />
                Market intel dashboard
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-info" />
                AI role-fit scoring
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-info" />
                No data leaves your machine
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-20">
        <Card className="flex flex-col items-center gap-4 bg-accent px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">
            Your next role is in the data
          </h2>
          <p className="max-w-md text-sm text-white/80">
            Import your hunt, get the numbers, walk into the next interview
            prepared. Free for your own tracker.
          </p>
          <Link href="/login?mode=register">
            <Button variant="primary" size="lg" className="mt-2">
              Create your tracker
            </Button>
          </Link>
        </Card>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border-subtle py-6 text-center text-xs text-text-tertiary">
        <p>
          Queuti — modern job tracker · built with care ·{" "}
          <Link href="/login" className="underline-offset-2 hover:text-text-secondary">
            sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
