import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/src/lib/auth";
import { DomainService, DomainError } from "@/src/modules/domain";

const domainService = new DomainService();

/**
 * POST /api/domain/verify
 * Body: { projectId }
 *
 * Triggers domain verification for a project's custom domain.
 * Currently auto-approves (placeholder for OpenProvider integration).
 */
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await domainService.requestVerification(projectId, userId);
    return NextResponse.json({
      domainVerificationStatus: project.domainVerificationStatus,
      domainVerifiedAt: project.domainVerifiedAt,
      customDomain: project.customDomain,
    });
  } catch (e) {
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
