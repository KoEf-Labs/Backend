/**
 * Cleanup expired tokens from the database.
 * Run via: tsx scripts/cleanup-expired-tokens.ts
 * Or via PM2 cron: see ecosystem.config.js
 *
 * Deletes:
 *   - RefreshToken where expiresAt < now
 *   - VerificationToken where expiresAt < now
 *   - Project (hard delete) where deletedAt < now - 30 days
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOFT_DELETE_GRACE_DAYS = 30;

async function main() {
  const now = new Date();
  const graceCutoff = new Date(
    now.getTime() - SOFT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000
  );

  const started = Date.now();

  const [refresh, verify, projects] = await Promise.all([
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.verificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.project.deleteMany({
      where: { deletedAt: { not: null, lt: graceCutoff } },
    }),
  ]);

  const durationMs = Date.now() - started;

  const result = {
    level: "info",
    message: "cleanup-expired-tokens",
    timestamp: now.toISOString(),
    durationMs,
    deleted: {
      refreshTokens: refresh.count,
      verificationTokens: verify.count,
      softDeletedProjects: projects.count,
    },
  };

  console.log(JSON.stringify(result));
}

main()
  .catch((e) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "cleanup-expired-tokens failed",
        timestamp: new Date().toISOString(),
        error: e instanceof Error ? e.message : String(e),
      })
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
