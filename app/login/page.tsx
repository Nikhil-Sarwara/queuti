"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, TextField, Button } from "@/components/ui";

// `?mode=register` (landing CTAs) preselects the register tab.
const initialMode = (): "login" | "register" =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("mode") === "register"
    ? "register"
    : "login";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const endpoint =
      mode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Card>
        <h1 className="text-xl font-bold">Queuti — Sign in</h1>
        <p className="mt-1 text-xs opacity-70">
          {mode === "login"
            ? "Welcome back. Login to your job tracker."
            : "Create an account to start tracking."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <TextField
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p role="alert" className="rounded border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy}>
            {busy ? "One sec…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-xs opacity-70">
          {mode === "login" ? (
            <>
              No account yet?{" "}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setMode("register")}
              >
                Register
              </button>
              {" · "}
              <Link href="/forgot-password" className="font-semibold underline">
                Forgot password?
              </Link>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </Card>
      <p className="mt-6 text-center text-xs opacity-50">
        <Link href="/">← Back to home</Link>
      </p>
    </main>
  );
}