import { NextRequest, NextResponse } from "next/server";
import { DomainService } from "@/src/modules/domain";

const domainService = new DomainService();

/**
 * GET /api/domain/check?subdomain=mysite
 * GET /api/domain/check?customDomain=mybusiness.com
 *
 * Returns { available, valid, error? }
 */
export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain");
  const customDomain = req.nextUrl.searchParams.get("customDomain");

  if (subdomain) {
    const validation = await domainService.validateSubdomainWithBlacklist(subdomain);
    if (!validation.valid) {
      return NextResponse.json({ available: false, valid: false, error: validation.error });
    }
    const available = await domainService.isSubdomainAvailable(subdomain);
    return NextResponse.json({ available, valid: true });
  }

  if (customDomain) {
    const validation = domainService.validateCustomDomain(customDomain);
    if (!validation.valid) {
      return NextResponse.json({ available: false, valid: false, error: validation.error });
    }
    const available = await domainService.isCustomDomainAvailable(customDomain);
    return NextResponse.json({ available, valid: true });
  }

  return NextResponse.json({ error: "Provide subdomain or customDomain query param" }, { status: 400 });
}
