/**
 * Iyzico integration — TR customers, TRY billing. We use the hosted
 * Checkout Form flow: initialize a session server-side, get back a URL
 * and a token, hand them to the client. The client opens the URL in a
 * WebView (3-D Secure + saved cards all handled by Iyzico's UI). After
 * the user pays, Iyzico POSTs to our callback; we retrieve the final
 * state and flip the Payment row.
 *
 * iyzipay's Node SDK is callback-only and untyped, so everything here is
 * wrapped in a promise and we declare a narrow type for the pieces we
 * actually use.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Iyzipay from "iyzipay";
import { prisma } from "@/src/lib/db";
import {
  CreateIntentInput,
  IntentResult,
  PaymentError,
  RefundInput,
  RefundResult,
} from "./types";

// ── Narrow types over the untyped SDK ──────────────────────────────────
interface IyzipayClient {
  checkoutFormInitialize: { create(req: unknown, cb: (err: unknown, res: unknown) => void): void };
  checkoutForm: { retrieve(req: unknown, cb: (err: unknown, res: unknown) => void): void };
  refund: { create(req: unknown, cb: (err: unknown, res: unknown) => void): void };
}

interface IyzicoResponse {
  status: string; // "success" / "failure"
  errorCode?: string;
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
  paymentStatus?: string; // "SUCCESS" / "FAILURE"
  paymentId?: string;
  cardUserKey?: string;
}

let _iyzipay: IyzipayClient | null = null;

export function getIyzipay(): IyzipayClient {
  if (_iyzipay) return _iyzipay;
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const uri = process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com";
  if (!apiKey || !secretKey) {
    throw new PaymentError("Iyzico is not configured", 503);
  }
  _iyzipay = new (Iyzipay as unknown as new (cfg: Record<string, string>) => IyzipayClient)({
    apiKey,
    secretKey,
    uri,
  });
  return _iyzipay;
}

function callIyzico<T = IyzicoResponse>(
  run: (cb: (err: unknown, res: unknown) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    run((err, res) => {
      if (err) return reject(err);
      resolve(res as T);
    });
  });
}

export async function createIyzicoIntent(
  input: CreateIntentInput
): Promise<IntentResult> {
  const iyz = getIyzipay();

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: "IYZICO",
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      purpose: input.purpose,
      status: "PENDING",
    },
  });

  // Iyzico wants decimal strings with "." — convert from smallest unit.
  const price = (input.amount / 100).toFixed(2);

  const [firstName, ...rest] = input.customerName.trim().split(/\s+/);
  const lastName = rest.length ? rest.join(" ") : firstName;

  const body: Record<string, unknown> = {
    locale: "tr",
    conversationId: payment.id,
    price,
    paidPrice: price,
    currency: input.currency.toUpperCase(),
    basketId: payment.id,
    paymentGroup: "PRODUCT",
    callbackUrl: input.returnUrl,
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer: {
      id: input.userId,
      name: firstName,
      surname: lastName,
      email: input.customerEmail,
      identityNumber: "11111111111", // not collected here; Iyzico accepts placeholder for checkout form
      registrationAddress: "N/A",
      city: "Istanbul",
      country: "Turkey",
      ip: "0.0.0.0",
    },
    shippingAddress: {
      contactName: input.customerName,
      city: "Istanbul",
      country: "Turkey",
      address: "N/A",
    },
    billingAddress: {
      contactName: input.customerName,
      city: "Istanbul",
      country: "Turkey",
      address: "N/A",
    },
    basketItems: [
      {
        id: payment.id,
        name: input.purpose.slice(0, 60),
        category1: "Digital",
        itemType: "VIRTUAL",
        price,
      },
    ],
  };
  if (input.savedCustomerRef) {
    body.cardUserKey = input.savedCustomerRef;
  }

  const res = await callIyzico((cb) =>
    iyz.checkoutFormInitialize.create(body, cb)
  );
  if (res.status !== "success" || !res.paymentPageUrl || !res.token) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        providerMeta: { error: res.errorMessage ?? res.errorCode ?? null },
      },
    });
    throw new PaymentError(
      res.errorMessage ?? "Iyzico checkout initialization failed",
      400
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerTxnId: res.token },
  });

  return {
    provider: "iyzico",
    paymentId: payment.id,
    clientAction: {
      kind: "iyzico_redirect",
      url: res.paymentPageUrl,
      token: res.token,
    },
  };
}

/**
 * Called from the callback webhook after the user completes the form.
 * Returns the final status so the route can update our Payment row.
 */
export async function retrieveIyzicoCheckout(token: string): Promise<{
  success: boolean;
  providerPaymentId?: string;
  cardUserKey?: string;
  conversationId?: string;
  meta: unknown;
}> {
  const iyz = getIyzipay();
  const res = await callIyzico<
    IyzicoResponse & { conversationId?: string }
  >((cb) => iyz.checkoutForm.retrieve({ token, locale: "tr" }, cb));

  const success =
    res.status === "success" && res.paymentStatus === "SUCCESS";

  return {
    success,
    providerPaymentId: res.paymentId,
    cardUserKey: res.cardUserKey,
    conversationId: res.conversationId,
    meta: res,
  };
}

export async function refundIyzico(
  input: RefundInput
): Promise<RefundResult> {
  const iyz = getIyzipay();
  const res = await callIyzico((cb) =>
    iyz.refund.create(
      {
        locale: "tr",
        conversationId: input.paymentId,
        paymentTransactionId: input.providerTxnId,
        price: (input.amount / 100).toFixed(2),
        ip: "0.0.0.0",
        reason: input.reason ?? "other",
        description: input.reason,
      },
      cb
    )
  );
  if (res.status !== "success") {
    throw new PaymentError(res.errorMessage ?? "Iyzico refund failed", 400);
  }
  return {
    refundedAt: new Date(),
    providerRefundId: res.paymentId ?? input.providerTxnId,
  };
}
