"use client";

import { Button, Card } from "@/components/ui";

/** Global error boundary — a repair bench instead of a white screen. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-8">
      <Card material="wood" framed className="w-full text-center shadow-bevel-lg">
        <p className="font-display text-6xl font-bold text-engraved">🔧</p>
        <h1 className="mt-2 font-display text-xl font-bold text-ink">
          Something bent out of shape
        </h1>
        <p className="mt-1 text-sm opacity-70">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="mt-4 flex justify-center">
          <Button variant="brass" onClick={reset}>
            🛠️ Try again
          </Button>
        </div>
      </Card>
    </main>
  );
}