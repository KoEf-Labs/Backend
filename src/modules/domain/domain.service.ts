import { prisma } from "@/src/lib/db";
import { DomainVerificationStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Domain Provider Interface (swap with OpenProvider later)
// ---------------------------------------------------------------------------

export interface DomainProvider {
  verifyDomain(domain: string): Promise<{ verified: boolean; message: string }>;
  // Future: configureDns(), purchaseDomain(), renewDomain(), etc.
}

class PlaceholderDomainProvider implements DomainProvider {
  async verifyDomain(_domain: string) {
    // Auto-approve for now — replace with OpenProvider API later
    return { verified: true, message: "Domain verification placeholder — auto-approved" };
  }
}

// ---------------------------------------------------------------------------
// Reserved Subdomains
// ---------------------------------------------------------------------------

const RESERVED_SUBDOMAINS = new Set([
  "api", "www", "admin", "app", "mail", "ftp", "ssh",
  "blog", "shop", "store", "help", "support", "status", "docs",
  "staging", "dev", "test", "demo", "cdn", "assets", "static",
  "auth", "login", "register", "dashboard", "panel",
  "ns1", "ns2", "mx", "smtp", "imap", "pop",
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DomainService {
  private provider: DomainProvider;

  constructor(provider?: DomainProvider) {
    this.provider = provider ?? new PlaceholderDomainProvider();
  }

  // --- Subdomain ---

  validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
    const clean = subdomain.trim().toLowerCase();
    if (clean.length < 3) return { valid: false, error: "Subdomain must be at least 3 characters" };
    if (clean.length > 63) return { valid: false, error: "Subdomain must be at most 63 characters" };
    if (!SUBDOMAIN_REGEX.test(clean)) return { valid: false, error: "Subdomain can only contain lowercase letters, numbers, and hyphens" };
    if (RESERVED_SUBDOMAINS.has(clean)) return { valid: false, error: "This subdomain is reserved" };
    return { valid: true };
  }

  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const existing = await prisma.project.findUnique({
      where: { subdomain: subdomain.trim().toLowerCase() },
      select: { id: true },
    });
    return !existing;
  }

  // --- Custom Domain ---

  validateCustomDomain(domain: string): { valid: boolean; error?: string } {
    const clean = domain.trim().toLowerCase();
    if (clean.length < 4) return { valid: false, error: "Domain is too short" };
    if (clean.length > 253) return { valid: false, error: "Domain is too long" };
    if (!DOMAIN_REGEX.test(clean)) return { valid: false, error: "Invalid domain format" };
    return { valid: true };
  }

  async isCustomDomainAvailable(domain: string): Promise<boolean> {
    const existing = await prisma.project.findUnique({
      where: { customDomain: domain.trim().toLowerCase() },
      select: { id: true },
    });
    return !existing;
  }

  // --- Verification ---

  async requestVerification(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainError("Project not found", 404);
    if (project.userId !== userId) throw new DomainError("Not authorized", 403);
    if (!project.customDomain) throw new DomainError("No custom domain set", 400);

    // Call provider (placeholder: auto-approves)
    const result = await this.provider.verifyDomain(project.customDomain);

    const status = result.verified
      ? DomainVerificationStatus.VERIFIED
      : DomainVerificationStatus.FAILED;

    return prisma.project.update({
      where: { id: projectId },
      data: {
        domainVerificationStatus: status,
        ...(result.verified && { domainVerifiedAt: new Date() }),
      },
    });
  }

  // --- Lookup (for public site serving) ---

  async findBySubdomain(subdomain: string) {
    return prisma.project.findUnique({
      where: { subdomain: subdomain.trim().toLowerCase() },
    });
  }

  async findByCustomDomain(domain: string) {
    return prisma.project.findUnique({
      where: { customDomain: domain.trim().toLowerCase() },
    });
  }

  /**
   * Resolve a Host header to a project.
   * - If host ends with base domain → extract subdomain and lookup
   * - Otherwise → treat as custom domain
   */
  async resolveHost(host: string, baseDomain: string) {
    const clean = host.toLowerCase().replace(/:\d+$/, ""); // strip port

    // Subdomain check: mysite.basedomain.com
    if (clean.endsWith(`.${baseDomain}`)) {
      const subdomain = clean.replace(`.${baseDomain}`, "");
      if (subdomain && !subdomain.includes(".")) {
        return this.findBySubdomain(subdomain);
      }
      return null;
    }

    // Custom domain check
    if (clean !== baseDomain) {
      return this.findByCustomDomain(clean);
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class DomainError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DomainError";
    this.status = status;
  }
}
