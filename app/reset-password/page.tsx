"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, TextField, Button } from "@/components/ui";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDone(true);
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block text-2xl font-bold text-text-primary">
          Queuti <span className="text-accent">🦉</span>
        </Link>
        <h1 className="mt-4 text-xl font-bold text-text-primary">
          {done ? "Password updated" : "Choose a new password"}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {done
            ? "Taking you to sign in…"
            : "Pick a new password for your Queuti account."}
        </p>
      </div>

      {!done && (
        <form onSubmit={onSubmit} className="space-y-4">
          <TextField
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat it"
            required
          />
          {error && (
            <p role="alert" className="rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !token} className="w-full">
            {busy ? "Saving…" : "Set new password"}
          </Button>
          {!token && (
            <p className="text-center text-xs text-text-tertiary">
              This link is missing its token. Request a fresh one from the{" "}
              <Link href="/forgot-password" className="text-accent hover:text-accent-hover">
                forgot password
              </Link>{" "}
              page.
            </p>
          )}
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <p className="text-center text-sm text-text-tertiary">Loading…</p>
          </Card>
        }
      >
        <ResetForm />
      </Suspense>
    </main>
  );
}
