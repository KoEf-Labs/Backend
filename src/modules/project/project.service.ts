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

    // Generate static HTML and write to disk
    try {
      await publishService.publishToStatic({
        id: updated.id,
        theme: updated.theme,
        subdomain: updated.subdomain,
        customDomain: updated.customDomain,
        publishedContent: updated.publishedContent,
      });
    } catch (e) {
      // Don't fail the approve if static publish fails — site still works via runtime render
      const msg = e instanceof Error ? e.message : String(e);
      const { logger } = await import("@/src/lib/logger");
      logger.error("Static publish failed", { projectId: id, error: msg });
    }

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

    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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
