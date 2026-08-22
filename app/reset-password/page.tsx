"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, TextField, Button } from "@/components/ui";

/** Reset form — token arrives via ?token= in the reset email link. */
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
    <Card>
      <h1 className="text-xl font-bold">🔑 Choose a new password</h1>
      <p className="mt-1 text-xs opacity-70">
        {done
          ? "Password updated — taking you to sign in…"
          : "Pick a new password for your Queuti account."}
      </p>

      {!done && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            <p className="rounded border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !token}>
            {busy ? "Saving…" : "Set new password"}
          </Button>
          {!token && (
            <p className="text-xs opacity-60">
              This link is missing its token — it may be truncated. Request a
              fresh one from the forgot-password page.
            </p>
          )}
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Suspense fallback={<Card><p className="text-sm opacity-60">Loading…</p></Card>}>
        <ResetForm />
      </Suspense>
      <p className="mt-6 text-center text-xs opacity-50">
        <Link href="/login">← Back to sign in</Link>
      </p>
    </main>
  );
}