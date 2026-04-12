import { prisma } from "@/src/lib/db";
import { Prisma, ProjectStatus } from "@prisma/client";
import { writeAudit, type AuditAction } from "@/src/lib/audit";
import fs from "fs/promises";
import path from "path";

const SITES_DIR = process.env.SITES_DIR || path.join(process.cwd(), "public", "sites");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface UserListFilter extends PaginationInput {
  search?: string;
  suspended?: boolean;
}

export interface ProjectListFilter extends PaginationInput {
  search?: string;
  status?: ProjectStatus;
  userId?: string;
}

export interface AuditListFilter extends PaginationInput {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AdminService {
  // ── Users ──────────────────────────────────────────────────────────

  async listUsers(filter: UserListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 25));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (filter.search) {
      where.OR = [
        { email: { contains: filter.search, mode: "insensitive" } },
        { name: { contains: filter.search, mode: "insensitive" } },
      ];
    }
    if (filter.suspended !== undefined) {
      where.suspended = filter.suspended;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          suspended: true,
          suspendedAt: true,
          suspendReason: true,
          lastActivityAt: true,
          createdAt: true,
          _count: { select: { projects: { where: { deletedAt: null } } } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getUserDetail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        emailVerified: true,
        suspended: true,
        suspendedAt: true,
        suspendReason: true,
        lastActivityAt: true,
        createdAt: true,
        updatedAt: true,
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            theme: true,
            status: true,
            subdomain: true,
            customDomain: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });
    return user;
  }

  async suspendUser(
    id: string,
    reason: string | null,
    admin: { id: string; email: string }
  ) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        suspended: true,
        suspendedAt: new Date(),
        suspendReason: reason?.slice(0, 500) || null,
      },
    });
    // Kill all sessions
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "suspend_user",
      targetType: "user",
      targetId: id,
      metadata: reason ? { reason } : undefined,
    });
    return user;
  }

  async unsuspendUser(id: string, admin: { id: string; email: string }) {
    const user = await prisma.user.update({
      where: { id },
      data: { suspended: false, suspendedAt: null, suspendReason: null },
    });
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "unsuspend_user",
      targetType: "user",
      targetId: id,
    });
    return user;
  }

  async manualVerifyEmail(id: string, admin: { id: string; email: string }) {
    const user = await prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    });
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "verify_user_email",
      targetType: "user",
      targetId: id,
    });
    return user;
  }

  // ── Dashboard stats ────────────────────────────────────────────────

  async dashboardStats() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalProjects,
      publishedProjects,
      pendingProjects,
      draftProjects,
      rejectedProjects,
      suspendedUsers,
      usersToday,
      projectsToday,
      usersLast7d,
      verifiedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { status: "PUBLISHED", deletedAt: null } }),
      prisma.project.count({ where: { status: "PENDING", deletedAt: null } }),
      prisma.project.count({ where: { status: "DRAFT", deletedAt: null } }),
      prisma.project.count({ where: { status: "REJECTED", deletedAt: null } }),
      prisma.user.count({ where: { suspended: true } }),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.project.count({
        where: { createdAt: { gte: startOfToday }, deletedAt: null },
      }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { emailVerified: true } }),
    ]);

    return {
      users: {
        total: totalUsers,
        suspended: suspendedUsers,
        verified: verifiedUsers,
        newToday: usersToday,
        newLast7d: usersLast7d,
        verificationRate: totalUsers > 0 ? verifiedUsers / totalUsers : 0,
      },
      projects: {
        total: totalProjects,
        published: publishedProjects,
        pending: pendingProjects,
        draft: draftProjects,
        rejected: rejectedProjects,
        newToday: projectsToday,
      },
    };
  }

  async diskUsage() {
    const sites = await this.dirSize(SITES_DIR).catch(() => 0);
    const uploads = await this.dirSize(UPLOADS_DIR).catch(() => 0);
    return { sites, uploads, total: sites + uploads };
  }

  private async dirSize(dir: string): Promise<number> {
    let total = 0;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          total += await this.dirSize(p);
        } else if (entry.isFile()) {
          const stat = await fs.stat(p).catch(() => null);
          if (stat) total += stat.size;
        }
      }
    } catch {
      // path missing — skip
    }
    return total;
  }

  // ── Projects (admin-wide list, not just pending) ───────────────────

  async listProjects(filter: ProjectListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 25));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = { deletedAt: null };
    if (filter.status) where.status = filter.status;
    if (filter.userId) where.userId = filter.userId;
    if (filter.search) {
      where.OR = [
        { subdomain: { contains: filter.search, mode: "insensitive" } },
        { customDomain: { contains: filter.search, mode: "insensitive" } },
        { theme: { contains: filter.search, mode: "insensitive" } },
        { user: { email: { contains: filter.search, mode: "insensitive" } } },
      ];
    }

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
          status: true,
          subdomain: true,
          customDomain: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true, name: true } },
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
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // ── Audit log ──────────────────────────────────────────────────────

  async listAudit(filter: AuditListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (filter.adminId) where.adminId = filter.adminId;
    if (filter.action) where.action = filter.action;
    if (filter.targetType) where.targetType = filter.targetType;
    if (filter.targetId) where.targetId = filter.targetId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async writeAuditFromAdminBackend(entry: {
    adminId: string;
    adminEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }) {
    await writeAudit(entry as Parameters<typeof writeAudit>[0]);
  }

  // ── Time series (last N days) ──────────────────────────────────────

  async timeseries(days = 30) {
    const now = new Date();
    // Align to start of today in UTC so buckets line up
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const startDate = new Date(
      startOfToday.getTime() - (days - 1) * 24 * 60 * 60 * 1000
    );

    const [users, projects] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      prisma.project.findMany({
        where: { createdAt: { gte: startDate }, deletedAt: null },
        select: { createdAt: true },
      }),
    ]);

    // Build day buckets — YYYY-MM-DD keyed
    const usersByDay: Record<string, number> = {};
    const projectsByDay: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      usersByDay[key] = 0;
      projectsByDay[key] = 0;
    }

    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (key in usersByDay) usersByDay[key]++;
    }
    for (const p of projects) {
      const key = p.createdAt.toISOString().slice(0, 10);
      if (key in projectsByDay) projectsByDay[key]++;
    }

    return {
      days,
      buckets: Object.keys(usersByDay).map((date) => ({
        date,
        users: usersByDay[date],
        projects: projectsByDay[date],
      })),
    };
  }

  // ── Traffic (top sites + totals) ───────────────────────────────────

  async traffic(options?: { limit?: number; days?: number }) {
    const limit = Math.min(50, Math.max(1, options?.limit ?? 10));
    const days = Math.min(90, Math.max(1, options?.days ?? 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregate SiteView rows in the window, group by project
    const grouped = await prisma.siteView.groupBy({
      by: ["projectId"],
      where: { date: { gte: since } },
      _sum: { count: true, uniqueIps: true },
      orderBy: { _sum: { count: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) {
      return { days, totalViews: 0, totalUniqueIps: 0, top: [] };
    }

    const projectIds = grouped.map((g) => g.projectId);
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        subdomain: true,
        customDomain: true,
        theme: true,
        status: true,
        userId: true,
        user: { select: { email: true } },
      },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const top = grouped.map((g) => {
      const p = projectMap.get(g.projectId);
      return {
        projectId: g.projectId,
        views: g._sum.count ?? 0,
        uniqueIps: g._sum.uniqueIps ?? 0,
        subdomain: p?.subdomain ?? null,
        customDomain: p?.customDomain ?? null,
        theme: p?.theme ?? null,
        status: p?.status ?? null,
        userEmail: p?.user?.email ?? null,
      };
    });

    // Totals across the window (not just top N)
    const totals = await prisma.siteView.aggregate({
      where: { date: { gte: since } },
      _sum: { count: true, uniqueIps: true },
    });

    return {
      days,
      totalViews: totals._sum.count ?? 0,
      totalUniqueIps: totals._sum.uniqueIps ?? 0,
      top,
    };
  }
}
