/**
 * Hard-deletion sweep for accounts the user already requested to be
 * removed (DELETE /api/auth/me). The DELETE endpoint stamps
 * User.deletedAt and tombstone-renames the email so the user can sign
 * up again immediately; this sweep finishes the KVKK / GDPR "right to
 * be forgotten" obligation by removing the row entirely once the
 * retention window has passed.
 *
 * Retention defaults to 30 days, overridable via
 * ACCOUNT_DELETE_RETENTION_DAYS env var. The privacy policy promises
 * 30 days too — change both together.
 *
 * Cascade order matters because the schema doesn't declare ON DELETE
 * CASCADE for everything (Project rows have payments, audit logs ref
 * users, etc). We delete the dependents first, then the user row.
 */
import { prisma } from "./db";
import { logger } from "./logger";

function retentionDays(): number {
  const raw = process.env.ACCOUNT_DELETE_RETENTION_DAYS;
  if (!raw) return 30;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 3650) return 30;
  return n;
}

export async function sweepDeletedAccounts(): Promise<{
  hardDeleted: number;
  retentionDays: number;
}> {
  const days = retentionDays();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: { not: null, lte: cutoff },
    },
    select: { id: true },
  });

  let hardDeleted = 0;
  for (const { id: userId } of candidates) {
    try {
      await hardDeleteUser(userId);
      hardDeleted++;
    } catch (err) {
      logger.error("account_hard_delete_failed", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info("account_delete_sweep", {
    candidates: candidates.length,
    hardDeleted,
    retentionDays: days,
  });

  return { hardDeleted, retentionDays: days };
}

/**
 * Wipe a single user. Run inside a transaction so a failure in one
 * dependent doesn't leave the account half-removed. The order follows
 * the foreign-key fan-in: leaves first, then user.
 *
 * Subscription rows are *kept* with userId nulled out — except we
 * can't null userId because the column is required. Pragmatic call:
 * delete them too. If you need a billing audit trail for tax purposes,
 * surface a separate "billing receipts" tombstone table later.
 */
async function hardDeleteUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // User-owned auth artifacts.
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.verificationToken.deleteMany({ where: { userId } });

    // Theme entitlements (per-theme purchases — Subscription model
    // covers plan-level access).
    await tx.userThemeEntitlement.deleteMany({ where: { userId } });

    // Subscriptions before payments (some payment rows ref the
    // subscription's id).
    await tx.subscription.deleteMany({ where: { userId } });
    await tx.payment.deleteMany({ where: { userId } });

    // Projects — already soft-deleted by the request handler. Hard
    // delete now. The Project schema doesn't carry sub-rows that
    // outlive the project, so a single deleteMany is enough.
    await tx.project.deleteMany({ where: { userId } });

    // Finally the user row.
    await tx.user.delete({ where: { id: userId } });
  });
}
