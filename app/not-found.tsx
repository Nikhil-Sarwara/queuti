import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-elevated text-4xl">
          🦉
        </div>
        <h1 className="text-2xl font-bold text-text-primary">404</h1>
        <p className="mt-1 text-sm text-text-secondary">
          This page slipped off the desk.
          The link may be outdated, or the page was moved.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/">
            <Button variant="primary">← Back home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
