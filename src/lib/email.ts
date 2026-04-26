/**
 * Email service — picks the provider based on env:
 *   1. SMTP_HOST set → local Postfix (or any SMTP relay)
 *   2. RESEND_API_KEY set → Resend API
 *   3. neither → console (dev)
 *
 * The local SMTP path is what production uses now that we run our own
 * Postfix on the server. DKIM is applied by opendkim at the milter
 * level, so outgoing mail picks it up automatically — we don't need to
 * sign it in-app.
 */
import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

// Console provider (dev fallback)
class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string) {
    const text = html.replace(/<[^>]+>/g, "").trim();
    // Intentional console.log — dev-only, mirrors what the splunk-equivalent
    // would show for real sends.
    // eslint-disable-next-line no-console
    console.log(`\n📧 [EMAIL] To: ${to}\n   Subject: ${subject}\n   Content: ${text}\n`);
  }
}

// SMTP provider (production default — Postfix on localhost or any relay)
class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;
  private from: string;

  constructor(opts: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
  }) {
    this.from = opts.from;
    this.transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure, // true for 465, false for 25/587 (STARTTLS)
      auth: opts.user && opts.pass
        ? { user: opts.user, pass: opts.pass }
        : undefined,
      // Localhost Postfix often uses a self-signed cert; we trust it on
      // purpose. When SMTP_HOST points off-box (relay), the caller should
      // leave this default false and switch secure/port accordingly.
      tls: opts.host === "localhost" || opts.host === "127.0.0.1"
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      logger.info("Email sent", { to, subject });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("Email send failed", { to, subject, error: msg });
      throw e;
    }
  }
}

// Resend provider (alternative SaaS path, kept for fallback / dev envs)
class ResendEmailProvider implements EmailProvider {
  private client: Resend;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.client.emails.send({ from: this.from, to, subject, html });
      logger.info("Email sent", { to, subject });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("Email send failed", { to, subject, error: msg });
      throw e;
    }
  }
}

// Pick provider based on environment
function createProvider(): EmailProvider {
  const from = process.env.EMAIL_FROM || "noreply@sitevra.com";
  const smtpHost = process.env.SMTP_HOST;
  const resendKey = process.env.RESEND_API_KEY;

  if (smtpHost) {
    const port = Number(process.env.SMTP_PORT ?? 25);
    // secure=true only on 465; 25 and 587 start plain and upgrade via STARTTLS.
    const secure = port === 465;
    logger.info("Email provider: SMTP", { host: smtpHost, port, from });
    return new SmtpEmailProvider({
      host: smtpHost,
      port,
      secure,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from,
    });
  }

  if (resendKey) {
    logger.info("Email provider: Resend");
    return new ResendEmailProvider(resendKey, from);
  }

  logger.info("Email provider: Console (dev mode)");
  return new ConsoleEmailProvider();
}

const provider = createProvider();

// ─── Email functions ──────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, code: string) {
  await provider.sendEmail(
    email,
    "Verify your email",
    `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`
  );
}

export async function sendDeleteConfirmationEmail(email: string, code: string, projectName: string) {
  await provider.sendEmail(
    email,
    "Confirm project deletion",
    `<p>You requested to delete <strong>${projectName}</strong>.</p><p>Your confirmation code is: <strong>${code}</strong></p><p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  );
}

export async function sendAccountDeleteConfirmationEmail(email: string, code: string) {
  await provider.sendEmail(
    email,
    "Confirm account deletion",
    `<p>You requested to permanently delete your Sitevra account.</p>
     <p>Your confirmation code is: <strong>${code}</strong></p>
     <p>This code expires in 10 minutes. After confirmation your account, sites and subscriptions will be removed and cannot be restored.</p>
     <p>If you didn't request this, ignore this email and consider changing your password — someone may have your credentials.</p>`
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  await provider.sendEmail(
    email,
    "Reset your password",
    `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
  );
}
