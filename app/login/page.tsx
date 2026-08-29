"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, TextField, Button } from "@/components/ui";

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
    <main className="flex min-h-dvh items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block text-2xl font-bold text-text-primary">
            Queuti <span className="text-accent">🦉</span>
          </Link>
          <h1 className="mt-4 text-xl font-bold text-text-primary">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {mode === "login"
              ? "Sign in to your job tracker."
              : "Start tracking your applications today."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
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
            <p role="alert" className="rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "One sec…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 space-y-2 text-center text-xs text-text-secondary">
          {mode === "login" ? (
            <>
              <p>
                No account yet?{" "}
                <button
                  type="button"
                  className="font-medium text-accent hover:text-accent-hover"
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </p>
              <p>
                <Link href="/forgot-password" className="font-medium text-accent hover:text-accent-hover">
                  Forgot password?
                </Link>
              </p>
            </>
          ) : (
            <p>
              Have an account?{" "}
              <button
                type="button"
                className="font-medium text-accent hover:text-accent-hover"
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </Card>
    </main>
  );
}
