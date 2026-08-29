// Transactional email via Resend API (replaces raw SMTP).
// Node runtime only — never import from middleware/Edge code.
//
// Configure via env: RESEND_API_KEY (required).
// Optional: RESEND_FROM (default "Queuti <onboarding@resend.dev>" sandbox).
// Falls back to console logging when RESEND_API_KEY is missing (dev mode).

import { Resend } from "resend";

export interface MailResult {
  sent: boolean;
  reason?: string;
}

const RESEND_FROM_DEFAULT = "Queuti <onboarding@resend.dev>";

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getFrom(): string {
  return process.env.RESEND_FROM || RESEND_FROM_DEFAULT;
}

/** Shared send helper. Never throws — returns { sent, reason }. */
async function resendSend(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailResult> {
  if (!isResendConfigured()) {
    console.warn(
      `[mailer] RESEND_API_KEY not configured — email for ${opts.to} would be:\n` +
        `Subject: ${opts.subject}\n${opts.text}`
    );
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: getFrom(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    if (error) {
      console.error("[mailer] Resend API error:", error);
      return { sent: false, reason: error.message || "Resend API error" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[mailer] Resend send failed:", err);
    return {
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Send a password-reset email. Never throws — returns { sent, reason }. */
export async function sendResetEmail(
  to: string,
  resetUrl: string
): Promise<MailResult> {
  const subject = "Queuti — password reset";
  const text = [
    "Someone requested a password reset for your Queuti account.",
    "",
    `Reset your password here (link valid for 1 hour):`,
    resetUrl,
    "",
    "If you didn't request this, you can safely ignore this email — your",
    "password stays unchanged.",
  ].join("\n");

  return resendSend({ to, subject, text });
}

/** Send an email-verification message (#38). Never throws. */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<MailResult> {
  const subject = "Queuti — verify your email";
  const text = [
    "Welcome to Queuti! Please confirm your email address.",
    "",
    `Verify your email here (link valid for 7 days):`,
    verifyUrl,
    "",
    "If you didn't create a Queuti account, you can safely ignore this email.",
  ].join("\n");

  return resendSend({ to, subject, text });
}
