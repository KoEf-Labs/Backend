import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { createPaymentIntent, PaymentError } from "@/src/lib/payments";

/**
 * POST /api/payments/intent
 * Body: { amount, currency, purpose, returnUrl, provider? }
 *
 * Creates a PENDING Payment row and returns the provider-specific client
 * action (Stripe payment sheet data OR Iyzico checkout redirect URL).
 * Amount is in the smallest currency unit (cents / kuruş).
 *
 * Access: profileCompleted users only — we don't sell to half-onboarded
 * accounts because downstream fraud / refund flow needs identity info.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileCompleted: true, suspended: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.suspended) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }
    if (!user.profileCompleted) {
      return NextResponse.json(
        { error: "Complete your profile before making a purchase" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const currency = String(body.currency ?? "").toUpperCase();
    const purpose = String(body.purpose ?? "").slice(0, 120);
    const returnUrl = String(body.returnUrl ?? "");
    const provider = body.provider === "stripe" || body.provider === "iyzico"
      ? body.provider
      : undefined;

    if (!Number.isInteger(amount) || amount < 50) {
      return NextResponse.json(
        { error: "amount must be a positive integer in smallest currency unit" },
        { status: 400 }
      );
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "currency must be a 3-letter ISO code" },
        { status: 400 }
      );
    }
    if (!purpose) {
      return NextResponse.json({ error: "purpose is required" }, { status: 400 });
    }
    if (!returnUrl) {
      return NextResponse.json(
        { error: "returnUrl is required" },
        { status: 400 }
      );
    }

    const result = await createPaymentIntent({
      userId,
      amount,
      currency,
      purpose,
      returnUrl,
      provider,
    });

    logger.info("payment_intent_created", {
      userId,
      paymentId: result.paymentId,
      provider: result.provider,
      amount,
      currency,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Intent failed";
    logger.error("POST /api/payments/intent failed", { error: message });
    return NextResponse.json({ error: "Payment intent failed" }, { status: 500 });
  }
}
