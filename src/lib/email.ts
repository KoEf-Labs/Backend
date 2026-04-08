/**
 * Email service interface.
 * Currently logs to console — swap with real provider (Resend, SendGrid, SMTP) for production.
 */

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, _html: string) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    }
  }
}

// Future: swap with real provider
// class ResendEmailProvider implements EmailProvider {
//   async sendEmail(to, subject, html) { await resend.emails.send({from, to, subject, html}); }
// }

const provider: EmailProvider = new ConsoleEmailProvider();

export async function sendVerificationEmail(email: string, code: string) {
  await provider.sendEmail(
    email,
    "Verify your email",
    `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`
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
