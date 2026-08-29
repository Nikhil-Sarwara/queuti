"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-4xl">
          🔧
        </div>
        <h1 className="text-2xl font-bold text-text-primary">
          Something went wrong
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link href="/">
            <Button variant="ghost">← Back home</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
