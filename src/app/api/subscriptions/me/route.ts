import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { getEffectiveAccess } from "@/src/lib/subscriptions";

/**
 * GET /api/subscriptions/me
 *
 * The mobile client polls this on app open / after a purchase to
 * confirm the user's effective tier. Feature gates (editor, project
 * create, theme selection) read from here and cache locally.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const access = await getEffectiveAccess(userId);
    return NextResponse.json({
      tier: access.tier,
      plan: access.plan,
      subscription: access.subscription,
    });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
