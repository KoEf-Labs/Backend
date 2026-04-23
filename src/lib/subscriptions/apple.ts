/**
 * Apple App Store Server verification.
 *
 * Today this is a verifier shell — when credentials land we'll plug in
 * the App Store Server API for full server-to-server validation. For
 * now we decode the client-provided JWS signedTransactionInfo with
 * Apple's public key set, which is what App Store Server Notifications
 * v2 signs, and works on-device too (StoreKit 2 `verificationResult`).
 *
 * Policy: if env is empty (APPLE_BUNDLE_ID missing) the verifier throws
 * 503 so the endpoint can respond gracefully without silently trusting
 * a payload. This keeps the feature "ready but disabled" until the
 * Apple side is configured.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/src/lib/db";
import {
  SubscriptionError,
  VerifiedPurchase,
} from "./types";

const APPLE_JWKS_URL = new URL(
  "https://api.storekit.itunes.apple.com/in-app-purchase/certs"
);
// Alternative production signer endpoint; some Apple payloads are signed
// by storekit.itunes.apple.com, others by api.storekit.itunes.apple.com.
// jose's `createRemoteJWKSet` follows the `kid` header so we can point
// at either URL — both serve the same Apple intermediate chain.
const appleJwks = createRemoteJWKSet(APPLE_JWKS_URL);

interface AppleDecodedTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  purchaseDate: number; // epoch ms
  expiresDate?: number; // epoch ms (subscriptions only)
  revocationDate?: number;
  type: string; // "Auto-Renewable Subscription" | "Non-Consumable" | ...
  environment?: string; // "Sandbox" | "Production"
}

/**
 * Verifies an Apple signedTransactionInfo JWT (StoreKit 2) and returns
 * a normalized purchase record. The caller is responsible for matching
 * the productId to a Plan row and persisting the Subscription.
 */
export async function verifyApplePurchase(
  signedTransactionJwt: string
): Promise<VerifiedPurchase> {
  const expectedBundleId = process.env.APPLE_BUNDLE_ID;
  if (!expectedBundleId) {
    throw new SubscriptionError("Apple IAP is not configured", 503);
  }

  let payload: AppleDecodedTransaction;
  try {
    const { payload: p } = await jwtVerify<AppleDecodedTransaction>(
      signedTransactionJwt,
      appleJwks
    );
    payload = p;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    throw new SubscriptionError(`Apple receipt invalid: ${msg}`, 401);
  }

  if (payload.bundleId !== expectedBundleId) {
    throw new SubscriptionError(
      `Apple bundleId mismatch (got ${payload.bundleId})`,
      401
    );
  }

  const plan = await prisma.plan.findFirst({
    where: { applePriceId: payload.productId, active: true },
  });
  if (!plan) {
    throw new SubscriptionError(
      `No plan mapped for Apple productId ${payload.productId}`,
      404
    );
  }

  // Auto-renewable subscription shape. Non-subs never set expiresDate;
  // we treat them as lifetime and push expiry far into the future so
  // the gate check stays simple.
  const start = new Date(payload.purchaseDate);
  const end = payload.expiresDate
    ? new Date(payload.expiresDate)
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10); // 10y

  const refunded = payload.revocationDate
    ? new Date(payload.revocationDate)
    : null;

  const now = Date.now();
  let status: VerifiedPurchase["status"];
  if (refunded) status = "REFUNDED";
  else if (end.getTime() < now) status = "EXPIRED";
  else status = "ACTIVE";

  return {
    provider: "APPLE",
    providerSubId: payload.originalTransactionId,
    plan,
    status,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    refundedAt: refunded,
    providerMeta: payload as unknown,
  };
}
