/**
 * Google Play Billing verification.
 *
 * The mobile client posts a `purchaseToken` and `productId`. We verify
 * by calling the Play Developer API:
 *   purchases.subscriptionsv2.get
 * Returns the current state + renewal/expiry/refund info.
 *
 * Credentials: a Service Account JSON with role "Finance/Read-only"
 * granted to the app in Play Console. Env:
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON   — the full JSON, stringified
 *   GOOGLE_PLAY_PACKAGE_NAME           — the Android package id
 *
 * While the env is empty we throw 503 — no silent fallback. When it's
 * filled the verifier does a direct JWT auth -> API call with no
 * dependency on a heavy Google SDK, keeping cold-start lean.
 */
import jwt from "jsonwebtoken";
import { prisma } from "@/src/lib/db";
import {
  SubscriptionError,
  VerifiedPurchase,
} from "./types";

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

/** Cached access token; refresh at most every 50 minutes. */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: GoogleServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: sa.token_uri,
      iat: now,
      exp: now + 3600,
    },
    sa.private_key,
    { algorithm: "RS256" }
  );
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new SubscriptionError(
      `Google auth failed: ${res.status} ${body}`,
      502
    );
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

interface GooglePlaySubscriptionV2 {
  lineItems?: Array<{
    productId: string;
    expiryTime: string;
    autoRenewingPlan?: { autoRenewEnabled: boolean };
  }>;
  startTime?: string;
  regionCode?: string;
  subscriptionState:
    | "SUBSCRIPTION_STATE_ACTIVE"
    | "SUBSCRIPTION_STATE_CANCELED"
    | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    | "SUBSCRIPTION_STATE_ON_HOLD"
    | "SUBSCRIPTION_STATE_PAUSED"
    | "SUBSCRIPTION_STATE_EXPIRED"
    | "SUBSCRIPTION_STATE_PENDING"
    | string;
  canceledStateContext?: unknown;
  linkedPurchaseToken?: string;
}

export async function verifyGooglePurchase(
  purchaseToken: string,
  productId: string
): Promise<VerifiedPurchase> {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!packageName || !saJson) {
    throw new SubscriptionError("Google Play IAP is not configured", 503);
  }

  let sa: GoogleServiceAccount;
  try {
    sa = JSON.parse(saJson);
  } catch {
    throw new SubscriptionError(
      "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON",
      500
    );
  }

  const accessToken = await getAccessToken(sa);
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/` +
    `${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new SubscriptionError(
      `Google verify failed: ${res.status} ${body}`,
      res.status === 404 ? 404 : 502
    );
  }
  const data = (await res.json()) as GooglePlaySubscriptionV2;

  const lineItem = data.lineItems?.[0];
  if (!lineItem) {
    throw new SubscriptionError("Google response missing lineItems", 502);
  }
  // The caller passed productId for convenience, but the API response
  // is authoritative — use whatever Google says is the actual product.
  const authoritativeProductId = lineItem.productId;

  const plan = await prisma.plan.findFirst({
    where: { googlePriceId: authoritativeProductId, active: true },
  });
  if (!plan) {
    throw new SubscriptionError(
      `No plan mapped for Google productId ${authoritativeProductId} (client sent ${productId})`,
      404
    );
  }

  const start = data.startTime ? new Date(data.startTime) : new Date();
  const end = new Date(lineItem.expiryTime);

  let status: VerifiedPurchase["status"];
  switch (data.subscriptionState) {
    case "SUBSCRIPTION_STATE_ACTIVE":
      status = "ACTIVE";
      break;
    case "SUBSCRIPTION_STATE_CANCELED":
      status = "CANCELED";
      break;
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
    case "SUBSCRIPTION_STATE_ON_HOLD":
      status = "PAST_DUE";
      break;
    case "SUBSCRIPTION_STATE_EXPIRED":
      status = "EXPIRED";
      break;
    case "SUBSCRIPTION_STATE_PENDING":
      status = "TRIALING";
      break;
    case "SUBSCRIPTION_STATE_PAUSED":
      status = "EXPIRED";
      break;
    default:
      status = "ACTIVE";
  }

  return {
    provider: "GOOGLE",
    providerSubId: purchaseToken,
    plan,
    status,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    canceledAt:
      data.subscriptionState === "SUBSCRIPTION_STATE_CANCELED"
        ? new Date()
        : null,
    providerMeta: data as unknown,
  };
}
