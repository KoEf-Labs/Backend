/**
 * Email service — Resend in production, console in dev.
 * Set RESEND_API_KEY and EMAIL_FROM in .env for production.
 */
import { Resend } from "resend";
import { logger } from "./logger";

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

// Console provider (dev)
class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, html: string) {
    const text = html.replace(/<[^>]+>/g, "").trim();
    console.log(`\n📧 [EMAIL] To: ${to}\n   Subject: ${subject}\n   Content: ${text}\n`);
  }
}

// Resend provider (production)
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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "noreply@yourapp.com";

  if (apiKey) {
    logger.info("Email provider: Resend");
    return new ResendEmailProvider(apiKey, from);
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

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
  await provider.sendEmail(
    email,
    "Reset your password",
    `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
  );
}
