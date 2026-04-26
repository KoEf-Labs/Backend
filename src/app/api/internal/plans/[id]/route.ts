import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { invalidatePlansCache } from "@/src/lib/plans-cache";

/**
 * PATCH /api/internal/plans/:id
 *
 * Admin updates the mutable bits of a Plan row. We only expose the
 * fields that actually belong to plan-level config:
 *   name, description, active, sortOrder
 *   priceUsd / priceEur / priceTry (smallest unit)
 *   applePriceId / googlePriceId / stripePriceId
 *
 * Tier + interval are immutable — changing those effectively means a
 * new plan, admin should add a fresh row and deactivate the old one.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    requireServiceToken(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    const adminId = req.headers.get("x-admin-id") ?? "";

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name.slice(0, 100);
    if (typeof body.description === "string" || body.description === null) {
      data.description = body.description;
    }
    if (typeof body.active === "boolean") data.active = body.active;
    if (Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.trunc(body.sortOrder);
    }
    for (const k of ["priceUsd", "priceEur", "priceTry"] as const) {
      if (k in body) {
        const v = body[k];
        data[k] = v === null ? null : Math.trunc(Number(v));
      }
    }
    for (const k of ["applePriceId", "googlePriceId", "stripePriceId"] as const) {
      if (k in body) {
        const v = body[k];
        data[k] = typeof v === "string" && v.trim() ? v.trim() : null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No mutable fields provided" },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.update({ where: { id }, data });
    invalidatePlansCache();

    await prisma.auditLog.create({
      data: {
        adminId: adminId || "system",
        adminEmail: adminEmail || "system",
        action: "plan_update",
        targetType: "plan",
        targetId: id,
        metadata: data as object,
      },
    });
    logger.info("plan_updated", { adminEmail, planId: id, fields: Object.keys(data) });

    return NextResponse.json(plan);
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
