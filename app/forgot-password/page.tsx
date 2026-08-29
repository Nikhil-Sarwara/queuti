"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, TextField, Button } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setSent(true);
      setDevLink(data.devResetLink ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block text-2xl font-bold text-text-primary">
            Queuti <span className="text-accent">🦉</span>
          </Link>
          <h1 className="mt-4 text-xl font-bold text-text-primary">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        {sent ? (
          <div className="space-y-3">
            <p className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">
              If an account exists for that email, a reset link is on its way.
              It expires in 1 hour.
            </p>
            {devLink && (
              <div className="rounded-lg border border-border-subtle bg-elevated px-3 py-2 text-xs">
                <p className="font-semibold uppercase tracking-wider text-text-tertiary">
                  Dev reset link
                </p>
                <Link href={devLink} className="mt-1 block break-all font-mono text-accent underline">
                  {devLink}
                </Link>
              </div>
            )}
            <Button variant="secondary" onClick={() => setSent(false)} className="w-full">
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {error && (
              <p role="alert" className="rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
