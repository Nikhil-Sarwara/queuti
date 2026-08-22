import Link from "next/link";
import { Button, Card } from "@/components/ui";

/** Skeuomorphic 404 — the page slipped off the desk. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-8">
      <Card material="wood" framed className="w-full text-center shadow-bevel-lg">
        <p className="font-display text-6xl font-bold text-engraved">404 🦉</p>
        <h1 className="mt-2 font-display text-xl font-bold text-ink">
          This page slipped off the desk
        </h1>
        <p className="mt-1 text-sm opacity-70">
          The link may be outdated, or the page was moved to another drawer.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/">
            <Button variant="leather">← Back home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="brass">🗂️ Dashboard</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}