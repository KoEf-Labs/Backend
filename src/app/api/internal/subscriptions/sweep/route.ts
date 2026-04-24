import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { sweepExpiredSubscriptions } from "@/src/lib/subscriptions";

/**
 * POST /api/internal/subscriptions/sweep — runs the expiry sweeper.
 * Called by the systemd timer on the server every hour (+1 manual
 * admin button for on-demand runs). Scans for:
 *   - ACTIVE/TRIALING rows whose currentPeriodEnd already passed →
 *     PAST_DUE with graceEndsAt stamped from settings.gracePeriodDays
 *   - PAST_DUE/CANCELED rows whose grace already passed → EXPIRED
 *   - CANCELED rows with no grace that ran out their paid period →
 *     EXPIRED
 *
 * Auth: same service token as the rest of the internal API, so the
 * admin panel can hit it. For the cron we also accept a raw
 * CRON_SECRET via X-Cron-Secret for when the caller isn't going
 * through the admin proxy.
 */
export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const passedCron = cronSecret && req.headers.get("x-cron-secret") === cronSecret;
    if (!passedCron) {
      requireServiceToken(req);
    }
    const result = await sweepExpiredSubscriptions();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
