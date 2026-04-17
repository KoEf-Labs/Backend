/**
 * Post-payment entitlement grants. Called from both payment webhooks
 * (Stripe + Iyzico) when a Payment flips to SUCCEEDED. The purpose field
 * encodes what the user bought — we parse it and write whatever domain
 * object the purchase unlocks.
 *
 *   "premium_theme:<name>"  → UserThemeEntitlement row
 *
 * Idempotent: running this twice for the same payment is a no-op thanks
 * to composite PKs and unique constraints.
 */
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";

export async function grantEntitlementForPayment(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, purpose: true, status: true },
  });
  if (!payment) return;
  if (payment.status !== "SUCCEEDED") return;

  const [kind, target] = payment.purpose.split(":", 2);
  if (!target) return;

  if (kind === "premium_theme") {
    await prisma.userThemeEntitlement.upsert({
      where: {
        userId_themeName: { userId: payment.userId, themeName: target },
      },
      create: {
        userId: payment.userId,
        themeName: target,
        paymentId: payment.id,
      },
      update: {
        // Keep the original acquiredAt/paymentId — refund cleanup is
        // handled separately. This branch only runs if the row somehow
        // already existed (double webhook, manual grant) which we treat
        // as a no-op.
      },
    });
    logger.info("entitlement_granted", {
      userId: payment.userId,
      theme: target,
      paymentId: payment.id,
    });
  }
}

/**
 * Called from refund flow. Revokes any entitlement that was granted by
 * this payment so the user loses access to what they returned.
 */
export async function revokeEntitlementsForPayment(paymentId: string): Promise<void> {
  const ent = await prisma.userThemeEntitlement.findMany({
    where: { paymentId },
    select: { userId: true, themeName: true },
  });
  if (ent.length === 0) return;
  await prisma.userThemeEntitlement.deleteMany({ where: { paymentId } });
  for (const e of ent) {
    logger.info("entitlement_revoked", {
      userId: e.userId,
      theme: e.themeName,
      paymentId,
    });
  }
}
