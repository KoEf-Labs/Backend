import { NextRequest, NextResponse } from "next/server";
import { DomainService } from "@/src/modules/domain";
import { getUserId } from "@/src/lib/auth";

const domainService = new DomainService();

/**
 * GET /api/domain/check?subdomain=mysite
 * GET /api/domain/check?customDomain=mybusiness.com
 *
 * Returns { available, valid, error? }
 *
 * Auth optional. When the caller is signed in we treat their own
 * DRAFT projects as "available" so backing out of the wizard and
 * trying a different theme doesn't surface a phantom collision.
 */
export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain");
  const customDomain = req.nextUrl.searchParams.get("customDomain");
  const callerUserId = getUserId(req) ?? undefined;

  if (subdomain) {
    const validation = await domainService.validateSubdomainWithBlacklist(subdomain);
    if (!validation.valid) {
      return NextResponse.json({ available: false, valid: false, error: validation.error });
    }
    const available = await domainService.isSubdomainAvailable(subdomain, callerUserId);
    return NextResponse.json({ available, valid: true });
  }

  if (customDomain) {
    const validation = domainService.validateCustomDomain(customDomain);
    if (!validation.valid) {
      return NextResponse.json({ available: false, valid: false, error: validation.error });
    }
    const available = await domainService.isCustomDomainAvailable(customDomain, callerUserId);
    return NextResponse.json({ available, valid: true });
  }

  return NextResponse.json({ error: "Provide subdomain or customDomain query param" }, { status: 400 });
}
