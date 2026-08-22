"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { toast } from "@/lib/toast";

/**
 * "Resend verification email" (#38). Calls the protected resend endpoint;
 * in dev the API returns the link which we surface for the round-trip check.
 */
export function ResendVerificationButton() {
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState("");

  const resend = async () => {
    setBusy(true);
    setError("");
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        devVerifyLink?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to resend");
      if (data.devVerifyLink) setDevLink(data.devVerifyLink);
      toast("📧 Verification email sent", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend");
      toast("⚠️ Could not resend verification", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" variant="brass" size="sm" onClick={resend} disabled={busy}>
        {busy ? "Sending…" : "📧 Resend verification"}
      </Button>
      {devLink && (
        <Card material="paper" className="!p-2 shadow-bevel-sm">
          <p className="text-[11px] opacity-60">Dev link (no SMTP configured):</p>
          <a
            href={devLink}
            className="block max-w-[260px] truncate text-[11px] font-semibold text-brass-dark underline underline-offset-2"
          >
            {devLink}
          </a>
        </Card>
      )}
      {error && (
        <p className="text-xs font-semibold text-blood" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}