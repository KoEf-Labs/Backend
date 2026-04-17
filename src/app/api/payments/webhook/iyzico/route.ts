import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { retrieveIyzicoCheckout } from "@/src/lib/payments/iyzico";
import { PaymentError } from "@/src/lib/payments";
import { grantEntitlementForPayment } from "@/src/lib/entitlements";

/**
 * POST /api/payments/webhook/iyzico
 *
 * Iyzico's Checkout Form posts form-encoded data back with a `token`
 * after the user completes payment. We retrieve the definitive status
 * from Iyzico (never trust the form fields) and update our Payment row.
 *
 * This endpoint is also hit by the client's WebView after the user
 * finishes — we return a simple HTML page so the WebView can detect
 * "done" and close, while the async status update has already landed.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token");
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const result = await retrieveIyzicoCheckout(token);
    const payment = await prisma.payment.findUnique({
      where: { providerTxnId: token },
    });
    if (!payment) {
      logger.warn("Iyzico callback for unknown token", { token });
      return htmlResponse("Payment not found", false);
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: result.success ? "SUCCEEDED" : "FAILED",
        providerTxnId: result.providerPaymentId ?? payment.providerTxnId,
        providerMeta: result.meta as object,
      },
    });

    // Save the Iyzico customer reference so the next purchase can reuse
    // the saved card without another 3-D secure prompt.
    if (result.success && result.cardUserKey) {
      await prisma.user.update({
        where: { id: payment.userId },
        data: { iyzicoCardUserKey: result.cardUserKey },
      });
    }

    // Grant whatever the user just bought (premium theme etc.).
    if (result.success) {
      await grantEntitlementForPayment(payment.id);
    }

    return htmlResponse(
      result.success ? "Ödeme başarılı" : "Ödeme başarısız",
      result.success
    );
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "callback failed";
    logger.error("Iyzico callback handler failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function htmlResponse(title: string, ok: boolean): Response {
  const color = ok ? "#10b981" : "#ef4444";
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 24px; background: #f9fafb; }
    .card { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); text-align: center; max-width: 360px; }
    h1 { color: ${color}; margin: 0 0 12px; font-size: 20px; }
    p { color: #6b7280; margin: 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>Bu pencere otomatik olarak kapanacak.</p>
  </div>
  <script>
    // Mobile WebView injects a done marker; the client listens for
    // "payment-done" in the URL bar or title to close the sheet.
    try { window.parent?.postMessage({ type: 'payment-done', ok: ${ok} }, '*'); } catch {}
  </script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
