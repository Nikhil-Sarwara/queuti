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
      // dev-only convenience: currentOrigin is always present client-side,
      // but only the API decides to include the link (non-production).
      setDevLink(data.devResetLink ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Card>
        <h1 className="text-xl font-bold">🔑 Reset your password</h1>
        <p className="mt-1 text-xs opacity-70">
          Enter your account email and we&apos;ll send a one-time reset link.
        </p>

        {sent ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-md border border-green-700/40 bg-green-50 px-3 py-2 text-sm text-green-900">
              If an account exists for that email, a reset link is on its way.
              It expires in 1 hour.
            </p>
            {devLink && (
              <div className="rounded-md border border-ink/20 bg-ink/5 px-3 py-2 text-xs">
                <p className="font-semibold uppercase tracking-wider opacity-60">
                  Dev reset link (local/staging only)
                </p>
                <Link href={devLink} className="mt-1 block break-all font-mono text-brass-dark underline">
                  {devLink}
                </Link>
              </div>
            )}
            <Button variant="paper" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {error && (
              <p role="alert" className="rounded border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </Card>
      <p className="mt-6 text-center text-xs opacity-50">
        <Link href="/login">← Back to sign in</Link>
      </p>
    </main>
  );
}