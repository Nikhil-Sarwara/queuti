"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  const run = useCallback(async () => {
    const token = params.get("token") || "";
    setState("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState("ok");
        setTimeout(() => router.push("/dashboard"), 1400);
      } else {
        setState("error");
        setMessage(data.error || "Verification failed");
      }
    } catch {
      setState("error");
      setMessage("Network error — please try again");
    }
  }, [params, router]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <main className="flex min-h-dvh items-center justify-center py-16">
      <Card className="w-full max-w-sm text-center">
        {state === "loading" && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl">
              🔐
            </div>
            <h1 className="text-xl font-bold text-text-primary">Verifying…</h1>
          </>
        )}

        {state === "ok" && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-2xl">
              ✅
            </div>
            <h1 className="text-xl font-bold text-success">Email verified!</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Taking you to your tracker…
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-error/10 text-2xl">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-error">Verification failed</h1>
            <p className="mt-1 text-sm text-text-secondary">{message}</p>
            <p className="mt-3 text-xs text-text-tertiary">
              Links expire after 7 days. If you&apos;re signed in, use the
              resend option on your account page.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mt-4 w-full"
              onClick={() => router.push("/login")}
            >
              Back to login
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
