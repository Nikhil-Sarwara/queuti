import { Badge, Button, Card, TextField } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      {/* masthead */}
      <header className="text-center">
        <h1 className="font-display text-5xl font-bold text-embossed text-ink">
          Queuti <span className="text-leather-600">🦉</span>
        </h1>
        <p className="mt-2 text-ink-soft">
          Track every application. Learn from real data. Know the market.
        </p>
      </header>

      {/* buttons */}
      <section>
        <h2 className="font-display text-xl font-semibold text-engraved text-ink-soft">Buttons</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="leather">Leather</Button>
          <Button variant="brass">Brass</Button>
          <Button variant="paper">Paper</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="leather" size="sm">Small</Button>
          <Button variant="leather" size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* panels */}
      <section>
        <h2 className="font-display text-xl font-semibold text-engraved text-ink-soft">Panels</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Card material="paper" framed>
            <h3 className="font-display text-lg font-bold">Paper</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Notes, forms and reading material — the desk surface.
            </p>
          </Card>
          <Card material="leather" framed>
            <h3 className="font-display text-lg font-bold">Leather</h3>
            <p className="mt-1 text-sm text-paper-light/80">
              The binder that holds your tracker together.
            </p>
          </Card>
          <Card material="wood" framed>
            <h3 className="font-display text-lg font-bold">Wood</h3>
            <p className="mt-1 text-sm text-ink-soft">
              The desk itself. Solid, warm, dependable.
            </p>
          </Card>
        </div>
      </section>

      {/* fields */}
      <section>
        <h2 className="font-display text-xl font-semibold text-engraved text-ink-soft">Fields</h2>
        <Card material="paper" framed className="mt-3">
          <div className="flex flex-col gap-4">
            <TextField label="Job title" name="title" placeholder="Senior Frontend Engineer" />
            <TextField
              label="Company"
              name="company"
              placeholder="Acme Corp"
              hint="Engraved, recessed fields — like writing in a ledger."
            />
            <div>
              <Button type="button">Add application</Button>
            </div>
          </div>
        </Card>
      </section>

      {/* status badges */}
      <section>
        <h2 className="font-display text-xl font-semibold text-engraved text-ink-soft">
          Status badges
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="applied">Applied</Badge>
          <Badge tone="screening">Screening</Badge>
          <Badge tone="interview">Interview</Badge>
          <Badge tone="offer">Offer</Badge>
          <Badge tone="rejected">Rejected</Badge>
          <Badge tone="ghosted">Ghosted</Badge>
        </div>
      </section>

      <footer className="border-t border-ink/15 pt-4 text-center text-xs text-ink-faint">
        Queuti — skeuomorphic job tracker · design system v1
      </footer>
    </main>
  );
}
