import { prisma } from "@/src/lib/db";
import { Prisma, ProjectStatus } from "@prisma/client";
import { ContentValidator } from "../theme/content-validator";
import { RenderService } from "../render/render.service";
import { PublishService } from "../publish";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateProjectInput {
  userId: string;
  theme: string;
  contentJson: Prisma.InputJsonValue;
  subdomain?: string;
  customDomain?: string;
}

export interface UpdateProjectInput {
  contentJson?: Prisma.InputJsonValue;
  theme?: string;
  subdomain?: string;
  customDomain?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const validator = new ContentValidator();

/**
 * Gate: ensure the user can use this theme. Non-premium themes are always
 * allowed; premium themes require a UserThemeEntitlement row. Admin-
 * disabled themes are rejected outright.
 *
 * Throws ServiceError so the controller can return the right HTTP status.
 */
async function assertThemeAccess(userId: string, theme: string): Promise<void> {
  const cfg = await prisma.themeConfig.findUnique({ where: { name: theme } });
  if (cfg && !cfg.enabled) {
    throw new ServiceError("Theme is disabled", 403);
  }
  if (!cfg?.isPremium) return; // free themes bypass
  const ent = await prisma.userThemeEntitlement.findUnique({
    where: { userId_themeName: { userId, themeName: theme } },
  });
  if (ent) return;
  // Pro / Business plans bundle every premium theme — no per-theme
  // entitlement required.
  try {
    const { getEffectiveAccess } = await import("@/src/lib/subscriptions");
    const access = await getEffectiveAccess(userId);
    if (access.tier === "PRO" || access.tier === "BUSINESS") return;
  } catch {
    // fall through — let the user hit the upgrade prompt rather than
    // 500ing the editor save when the access lookup misbehaves.
  }
  // Admins can use any theme for QA / demos.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "ADMIN") return;
  throw new ServiceError(
    "Bu tema Pro veya Business pakete dahil — paketini yükselt.",
    402 // Payment Required
  );
}
const renderService = new RenderService();
const publishService = new PublishService();

export class ProjectService {
  async getById(id: string) {
    return prisma.project.findFirst({ where: { id, deletedAt: null } });
  }

  async getByIdForUser(id: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new ServiceError("Project not found", 404);
    }

    if (project.userId !== userId) {
      throw new ServiceError("Not authorized to access this project", 403);
    }

    return project;
  }

  async listByUser(
    userId: string,
    options?: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = { userId, deletedAt: null };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          theme: true,
          draftContent: true,
          status: true,
          subdomain: true,
          customDomain: true,
          rejectReason: true,
          domainVerificationStatus: true,
          domainVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          // publishedContent excluded — large blob, not needed in list
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new project.
   * Content goes to draftContent, status starts as DRAFT.
   */
  async create(input: CreateProjectInput) {
    if (!input.userId || !input.theme) {
      throw new ServiceError("userId and theme are required", 400);
    }

    await assertThemeAccess(input.userId, input.theme);

    if (input.contentJson && typeof input.contentJson === "object") {
      const sanitized = validator.sanitizeContent(
        input.theme,
        input.contentJson as Record<string, unknown>
      );

      const result = validator.validateContent(input.theme, sanitized);
      const hardErrors = result.errors.filter((e) => e.type !== "xss");
      if (hardErrors.length > 0) {
        const messages = hardErrors.map((e) => `${e.path}: ${e.message}`);
        throw new ServiceError(
          `Content validation failed:\n${messages.join("\n")}`,
          400
        );
      }

      input.contentJson = sanitized as Prisma.InputJsonValue;
    }

    // Recycle stale DRAFTs from the same user that hold the
    // subdomain/custom domain we're about to claim. The unique
    // constraint would otherwise reject the insert even though the
    // owner has every right to reclaim their own abandoned wizard
    // run. We hard-delete (not soft) — DRAFTs were never published so
    // there's no public artefact to preserve.
    if (input.subdomain) {
      await prisma.project.deleteMany({
        where: {
          userId: input.userId,
          subdomain: input.subdomain,
          status: ProjectStatus.DRAFT,
        },
      });
    }
    if (input.customDomain) {
      await prisma.project.deleteMany({
        where: {
          userId: input.userId,
          customDomain: input.customDomain,
          status: ProjectStatus.DRAFT,
        },
      });
    }

    return prisma.project.create({
      data: {
        userId: input.userId,
        theme: input.theme,
        draftContent: input.contentJson ?? {},
        status: ProjectStatus.DRAFT,
        subdomain: input.subdomain || null,
        customDomain: input.customDomain || null,
      },
    });
  }

  /**
   * Update draft content. Editing always targets draftContent.
   * If project was PUBLISHED, status goes back to DRAFT (new edits need re-publish).
   */
  async update(id: string, userId: string, input: UpdateProjectInput) {
    const project = await this.getByIdForUser(id, userId);
    const theme = input.theme || project.theme;

    // Only re-check access when the user is actually switching themes —
    // otherwise edits on an already-owned project would suddenly fail if
    // admin later changed the theme's premium status.
    if (input.theme !== undefined && input.theme !== project.theme) {
      await assertThemeAccess(userId, input.theme);
    }

    if (input.contentJson && typeof input.contentJson === "object") {
      const sanitized = validator.sanitizeContent(
        theme,
        input.contentJson as Record<string, unknown>
      );

      const result = validator.validateContent(theme, sanitized);
      const hardErrors = result.errors.filter((e) => e.type !== "xss");
      if (hardErrors.length > 0) {
        const messages = hardErrors.map((e) => `${e.path}: ${e.message}`);
        throw new ServiceError(
          `Content validation failed:\n${messages.join("\n")}`,
          400
        );
      }

      input.contentJson = sanitized as Prisma.InputJsonValue;
    }

    // If content changed, reset status to DRAFT
    const shouldResetStatus =
      input.contentJson !== undefined && project.status !== ProjectStatus.DRAFT;

    return prisma.project.update({
      where: { id },
      data: {
        ...(input.contentJson !== undefined && {
          draftContent: input.contentJson,
        }),
        ...(input.theme !== undefined && { theme: input.theme }),
        ...(input.subdomain !== undefined && { subdomain: input.subdomain }),
        ...(input.customDomain !== undefined && {
          customDomain: input.customDomain,
        }),
        ...(shouldResetStatus && { status: ProjectStatus.DRAFT }),
      },
    });
  }

  /**
   * Submit project for review. status: DRAFT → PENDING
   */
  async submitForReview(id: string, userId: string) {
    const project = await this.getByIdForUser(id, userId);

    if (project.status === ProjectStatus.PENDING) {
      throw new ServiceError("Project is already pending review", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      throw new ServiceError(
        "Please verify your email before submitting a project for review",
        403
      );
    }

    return prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.PENDING },
    });
  }

  /**
   * Admin: approve project. draftContent → publishedContent, status → PUBLISHED
   */
  async approve(id: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new ServiceError("Project not found", 404);

    if (project.status !== ProjectStatus.PENDING) {
      throw new ServiceError("Only pending projects can be approved", 400);
    }

    // Invalidate old published content cache
    if (project.publishedContent) {
      renderService.invalidateCache(
        project.theme,
        project.publishedContent as Record<string, unknown>
      );
    }

    // Generate static HTML FIRST — if disk write fails we don't want a half-published row
    try {
      await publishService.publishToStatic({
        id: project.id,
        theme: project.theme,
        subdomain: project.subdomain,
        customDomain: project.customDomain,
        publishedContent: project.draftContent,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const { logger } = await import("@/src/lib/logger");
      logger.error("Static publish failed — aborting approve", {
        projectId: id,
        error: msg,
      });
      throw new ServiceError(
        "Static publish failed — please retry. Project status unchanged.",
        500
      );
    }

    // Static write succeeded; now flip DB state
    const updated = await prisma.project.update({
      where: { id },
      data: {
        publishedContent: project.draftContent as Prisma.InputJsonValue,
        status: ProjectStatus.PUBLISHED,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return updated;
  }

  /**
   * Admin: reject project. status → REJECTED
   */
  async reject(id: string, reason?: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new ServiceError("Project not found", 404);

    if (project.status !== ProjectStatus.PENDING) {
      throw new ServiceError("Only pending projects can be rejected", 400);
    }

    return prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.REJECTED,
        rejectReason: reason
          ? reason.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 500) || null
          : null,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Admin: list all pending projects for review.
   */
  async listPending() {
    return prisma.project.findMany({
      where: { status: ProjectStatus.PENDING, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Admin: fetch a single project by id (no user ownership check).
   */
  async adminGetById(id: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
    if (!project) throw new ServiceError("Project not found", 404);
    return project;
  }

  async delete(id: string, userId: string) {
    const project = await this.getByIdForUser(id, userId);

    // Remove static files if published
    if (project.subdomain || project.customDomain) {
      await publishService.removeStatic({
        subdomain: project.subdomain,
        customDomain: project.customDomain,
      }).catch(() => {});
    }

    // Release the subdomain/customDomain so someone else can reuse it
    // while the soft-deleted row waits for the hard-delete cron. The
    // @unique constraint would otherwise hold the name hostage.
    return prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        subdomain: null,
        customDomain: null,
      },
    });
  }

  /**
   * Admin: take a published site offline.
   *
   * - status → DRAFT so the user can re-submit after editing
   * - publishedContent → null (any fallback render falls back to draftContent)
   * - static HTML removed from disk
   * - render cache invalidated
   *
   * Does NOT delete the project or its draft content.
   */
  async adminUnpublish(id: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new ServiceError("Project not found", 404);
    if (project.status !== ProjectStatus.PUBLISHED) {
      throw new ServiceError("Only published projects can be unpublished", 400);
    }

    // Wipe disk first — if this fails we don't want to flip state and still
    // serve the old static file.
    if (project.subdomain || project.customDomain) {
      try {
        await publishService.removeStatic({
          subdomain: project.subdomain,
          customDomain: project.customDomain,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const { logger } = await import("@/src/lib/logger");
        logger.error("admin_unpublish_static_remove_failed", {
          projectId: id,
          error: msg,
        });
      }
    }

    // Invalidate render cache for old published content
    if (project.publishedContent) {
      renderService.invalidateCache(
        project.theme,
        project.publishedContent as Record<string, unknown>
      );
    }

    return prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.DRAFT,
        publishedContent: Prisma.JsonNull,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Admin: soft-delete a project without requiring the user's delete
   * confirmation code. Also removes static files from disk.
   */
  async adminDelete(id: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) throw new ServiceError("Project not found", 404);

    if (project.subdomain || project.customDomain) {
      await publishService
        .removeStatic({
          subdomain: project.subdomain,
          customDomain: project.customDomain,
        })
        .catch(() => {});
    }

    // Release the name so another user can claim it immediately. See delete()
    // for the same rationale.
    return prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        subdomain: null,
        customDomain: null,
      },
    });
  }

  /**
   * Bulk version of approve/reject/delete — processes up to N ids and
   * returns a per-id result. Stops on no ids so the caller can show
   * granular success/failure.
   */
  async adminBulkAction(
    ids: string[],
    action: "approve" | "reject" | "delete",
    reason?: string
  ): Promise<Array<{ id: string; ok: boolean; error?: string }>> {
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const id of ids) {
      try {
        if (action === "approve") await this.approve(id);
        else if (action === "reject") await this.reject(id, reason);
        else if (action === "delete") await this.adminDelete(id);
        results.push({ id, ok: true });
      } catch (e) {
        results.push({
          id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}
