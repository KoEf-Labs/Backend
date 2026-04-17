import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { createPaymentIntent, PaymentError } from "@/src/lib/payments";

/**
 * POST /api/themes/:name/purchase
 * Body: { returnUrl: string, currency?: "TRY" | "USD" }
 *
 * Creates a payment intent for unlocking a premium theme. The currency
 * is inferred from the user's country unless they override it:
 *   country === "TR" → TRY, else → USD.
 *
 * The server picks the amount from ThemeConfig.priceTry / priceUsd so
 * the client can't haggle. When the payment webhook marks the Payment
 * as SUCCEEDED, a separate hook writes the UserThemeEntitlement row —
 * see src/lib/entitlements.ts (grantEntitlementOnPaymentSucceeded).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  try {
    const userId = requireAuth(req);
    const { name } = await ctx.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { country: true, profileCompleted: true, suspended: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.suspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }
    if (!user.profileCompleted) {
      return NextResponse.json(
        { error: "Complete your profile before making a purchase" },
        { status: 403 }
      );
    }

    const theme = await prisma.themeConfig.findUnique({ where: { name } });
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    if (!theme.enabled) {
      return NextResponse.json({ error: "Theme is disabled" }, { status: 403 });
    }
    if (!theme.isPremium) {
      return NextResponse.json(
        { error: "Theme is not premium — no purchase required" },
        { status: 400 }
      );
    }

    const existing = await prisma.userThemeEntitlement.findUnique({
      where: { userId_themeName: { userId, themeName: name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already own this theme" },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = String(body.returnUrl ?? "");
    const requestedCurrency =
      body.currency === "TRY" || body.currency === "USD" ? body.currency : null;

    if (!returnUrl) {
      return NextResponse.json({ error: "returnUrl required" }, { status: 400 });
    }

    const currency =
      requestedCurrency ??
      (user.country === "TR" ? "TRY" : "USD");
    const amount = currency === "TRY" ? theme.priceTry : theme.priceUsd;
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: `No price configured for ${name} in ${currency}` },
        { status: 409 }
      );
    }

    const result = await createPaymentIntent({
      userId,
      amount,
      currency,
      purpose: `premium_theme:${name}`,
      returnUrl,
    });

    logger.info("theme_purchase_started", {
      userId,
      theme: name,
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
    const message = err instanceof Error ? err.message : "Purchase failed";
    logger.error("POST /api/themes/:name/purchase failed", { error: message });
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
