import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { refundPayment, PaymentError } from "@/src/lib/payments";

/**
 * POST /api/internal/payments/:id/refund
 * Admin-initiated refund. AdminBackend sends the acting admin's email via
 * x-admin-email / x-admin-id; we write it to AuditLog for accountability.
 * Body: { reason?: string }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    requireServiceToken(req);
    const { id } = await ctx.params;
    const adminId = req.headers.get("x-admin-id") ?? "";
    const adminEmail = req.headers.get("x-admin-email") ?? "";

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    const result = await refundPayment({ paymentId: id, reason });

    await prisma.auditLog.create({
      data: {
        adminId: adminId || "system",
        adminEmail: adminEmail || "system",
        action: "payment_refund",
        targetType: "payment",
        targetId: id,
        metadata: {
          providerRefundId: result.providerRefundId,
          provider: result.provider,
          reason: reason ?? null,
        },
      },
    });

    logger.info("payment_refunded", {
      paymentId: id,
      adminEmail,
      provider: result.provider,
      reason,
    });

    return NextResponse.json({
      ok: true,
      refundedAt: result.refundedAt,
      providerRefundId: result.providerRefundId,
    });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "refund failed";
    logger.error("Admin refund failed", { error: message });
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
