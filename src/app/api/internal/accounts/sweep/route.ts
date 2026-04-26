import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { sweepDeletedAccounts } from "@/src/lib/account-deletion";

/**
 * POST /api/internal/accounts/sweep — finishes the KVKK / GDPR
 * "right to be forgotten" obligation by hard-deleting users who
 * requested account deletion more than ACCOUNT_DELETE_RETENTION_DAYS
 * (default 30) ago. Idempotent.
 *
 * Auth: same dual-mode as the subscription sweep — accepts either
 * the internal service token (admin panel "Şimdi tara" button) or
 * the X-Cron-Secret header (systemd timer on the box).
 */
export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const passedCron =
      cronSecret && req.headers.get("x-cron-secret") === cronSecret;
    if (!passedCron) {
      requireServiceToken(req);
    }
    const result = await sweepDeletedAccounts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
