"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@/components/ui";

/**
 * Email verification landing page (#38). Reads ?token=, calls
 * /api/auth/verify, and shows the result. Works while signed out (the link
 * is the credential) — after success we redirect to /dashboard if a session
 * exists, else /login.
 */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4">
      <Card material="paper" framed className="w-full p-6 text-center shadow-bevel-lg">
        {state === "loading" && (
          <>
            <p className="text-3xl">🔐</p>
            <h1 className="mt-2 font-display text-xl font-bold">Verifying…</h1>
          </>
        )}
        {state === "ok" && (
          <>
            <p className="text-3xl">✅</p>
            <h1 className="mt-2 font-display text-xl font-bold text-moss-dark">
              Email verified!
            </h1>
            <p className="mt-1 text-sm opacity-70">
              Taking you to your tracker…
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <p className="text-3xl">⚠️</p>
            <h1 className="mt-2 font-display text-xl font-bold text-blood">
              Verification failed
            </h1>
            <p className="mt-1 text-sm opacity-70">{message}</p>
            <p className="mt-3 text-xs opacity-60">
              Links expire after 7 days. If you&apos;re signed in, use the
              resend option on your account page.
            </p>
            <Button
              type="button"
              variant="brass"
              className="mt-4"
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