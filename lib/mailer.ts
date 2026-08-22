// Minimal dependency-free SMTP mailer for transactional email (password reset).
// Uses node:tls — Node runtime routes only, never middleware.
//
// Configure via env: SMTP_HOST, SMTP_PORT (default 465), SMTP_USER, SMTP_PASS,
// SMTP_FROM (optional display/address override). With Gmail app passwords this
// sends as the authenticated account. If SMTP is not configured the mailer logs
// the message (and in dev the reset link is returned by the API anyway).

import { connect } from "node:tls";

export interface MailResult {
  sent: boolean;
  reason?: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Send a password-reset email. Never throws — returns { sent, reason }. */
export async function sendResetEmail(
  to: string,
  resetUrl: string
): Promise<MailResult> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@queuti.com";
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

  if (!isSmtpConfigured()) {
    console.warn(
      `[mailer] SMTP not configured — reset email for ${to} would be:\n${text}`
    );
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    await smtpSend({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT || 465),
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
      from,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] SMTP send failed:", err);
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Send an email-verification message (#38). Never throws. */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<MailResult> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@queuti.com";
  const subject = "Queuti — verify your email";
  const text = [
    "Welcome to Queuti! Please confirm your email address.",
    "",
    `Verify your email here (link valid for 7 days):`,
    verifyUrl,
    "",
    "If you didn't create a Queuti account, you can safely ignore this email.",
  ].join("\n");

  if (!isSmtpConfigured()) {
    console.warn(
      `[mailer] SMTP not configured — verification email for ${to} would be:\n${text}`
    );
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    await smtpSend({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT || 465),
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
      from,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] SMTP send failed:", err);
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

// ---------- raw SMTP (implicit TLS, AUTH PLAIN) ----------

interface SmtpOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

function smtpSend(opts: SmtpOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const sock = connect({ host: opts.host, port: opts.port, servername: opts.host });
    let buf = "";
    let stage = 0;
    let finished = false;

    const steps: Array<{
      cmd?: string;
      body?: string;
      expect: number[];
    }> = [
      { expect: [220] }, // server greeting
      { cmd: "EHLO queuti.local", expect: [250] },
      {
        cmd: `AUTH PLAIN ${Buffer.from(`\u0000${opts.user}\u0000${opts.pass}`).toString("base64")}`,
        expect: [235],
      },
      { cmd: `MAIL FROM:<${opts.from}>`, expect: [250] },
      { cmd: `RCPT TO:<${opts.to}>`, expect: [250] },
      { cmd: "DATA", expect: [354] },
      // body sent verbatim, terminated by the mandatory lone dot
      {
        body: `From: Queuti <${opts.from}>\r\nTo: ${opts.to}\r\nSubject: ${opts.subject}\r\n\r\n${opts.text}`,
        expect: [250],
      },
      { cmd: "QUIT", expect: [221] },
    ];

    const timeout = setTimeout(() => {
      fail(new Error("SMTP timeout"));
    }, 15000);

    function fail(err: Error) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      sock.destroy();
      reject(err);
    }

    function done() {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      sock.end();
      resolve();
    }

    function advance() {
      const step = steps[stage];
      if (!step) return done();
      if (step.cmd) sock.write(step.cmd + "\r\n");
      else if (step.body !== undefined) sock.write(step.body + "\r\n.\r\n");
    }

    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      let idx: number;
      while ((idx = buf.indexOf("\r\n")) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const code = parseInt(line.slice(0, 3), 10);
        if (Number.isNaN(code)) continue;
        if (code >= 400) return fail(new Error(`SMTP error: ${line}`));
        const step = steps[stage];
        // Multiline replies: continuation lines are "250-…", only the final
        // "250 …" line matches and advances the state machine.
        if (step && step.expect.includes(code) && line[3] === " ") {
          stage += 1;
          advance();
        }
      }
    });

    sock.on("error", fail);
    sock.on("close", () => {
      if (!finished) fail(new Error("SMTP connection closed unexpectedly"));
    });

    // handshake starts: wait for greeting (stage 0)
    advance();
  });
}