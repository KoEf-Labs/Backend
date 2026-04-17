import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import {
  verifyMernis,
  verifyPassport,
  isValidTrTaxIdFormat,
} from "@/src/lib/identity-verification";

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatar: true,
  role: true,
  emailVerified: true,
  profileCompleted: true,
  identityVerified: true,
  accountType: true,
  dateOfBirth: true,
  country: true,
  nationalId: true,
  passportNo: true,
  companyName: true,
  companyTaxId: true,
  createdAt: true,
} as const;

/**
 * POST /api/auth/profile/complete
 *
 * Marks the user's profile as complete. Runs identity verification (MERNIS
 * stub / passport stub) and persists the fields. Identity failures return
 * 422 and leave profileCompleted=false — the dashboard is gated on this flag
 * so the user stays on the profile setup screen until verification passes.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const body = (await req.json()) as {
      accountType?: "INDIVIDUAL" | "CORPORATE";
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string; // ISO date
      phone?: string;
      country?: string; // ISO-2 uppercase
      nationalId?: string;
      passportNo?: string;
      companyName?: string;
      companyTaxId?: string;
    };

    // ── Common field validation ─────────────────────────────────────
    if (body.accountType !== "INDIVIDUAL" && body.accountType !== "CORPORATE") {
      return NextResponse.json(
        { error: "Hesap tipi seçilmelidir" },
        { status: 400 }
      );
    }
    const firstName = (body.firstName ?? "").trim().slice(0, 50);
    const lastName = (body.lastName ?? "").trim().slice(0, 50);
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Ad ve soyad zorunlu" },
        { status: 400 }
      );
    }
    const phone = (body.phone ?? "").trim().slice(0, 20);
    if (!phone) {
      return NextResponse.json(
        { error: "Telefon numarası zorunlu" },
        { status: 400 }
      );
    }
    const country = (body.country ?? "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      return NextResponse.json({ error: "Ülke seçilmelidir" }, { status: 400 });
    }
    if (!body.dateOfBirth) {
      return NextResponse.json(
        { error: "Doğum tarihi zorunlu" },
        { status: 400 }
      );
    }
    const dob = new Date(body.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "Doğum tarihi geçersiz" },
        { status: 400 }
      );
    }
    const now = new Date();
    const age =
      now.getFullYear() -
      dob.getFullYear() -
      (now <
      new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
        ? 1
        : 0);
    if (age < 18) {
      return NextResponse.json(
        { error: "18 yaşından büyük olmalısınız" },
        { status: 400 }
      );
    }

    // ── Identity verification ────────────────────────────────────────
    // Individual accounts verify at the personal level (MERNIS for TR,
    // passport for everyone else). Corporate accounts verify at the
    // company level — tax ID + company name checked below — so we skip
    // the personal identity gate entirely for them.
    let identityVerified = false;
    let verifyReason: string | undefined;

    if (body.accountType === "INDIVIDUAL") {
      if (country === "TR") {
        const nationalId = (body.nationalId ?? "").trim();
        if (!nationalId) {
          return NextResponse.json(
            { error: "TC kimlik numarası zorunlu" },
            { status: 400 }
          );
        }
        const res = await verifyMernis({
          nationalId,
          firstName,
          lastName,
          birthYear: dob.getFullYear(),
        });
        identityVerified = res.valid;
        verifyReason = res.reason;
      } else {
        const passportNo = (body.passportNo ?? "").trim().toUpperCase();
        if (!passportNo) {
          return NextResponse.json(
            { error: "Pasaport numarası zorunlu" },
            { status: 400 }
          );
        }
        const res = await verifyPassport({
          passportNo,
          country,
          firstName,
          lastName,
          birthYear: dob.getFullYear(),
        });
        identityVerified = res.valid;
        verifyReason = res.reason;
      }

      if (!identityVerified) {
        return NextResponse.json(
          { error: verifyReason ?? "Kimlik doğrulaması başarısız" },
          { status: 422 }
        );
      }
    } else {
      // Corporate: mark verified once company fields validate below.
      // Tax-ID format is the real check for now; company-name validation
      // elsewhere (OCR / trade-registry lookup) is a future upgrade.
      identityVerified = true;
    }

    // ── Corporate-only fields ────────────────────────────────────────
    let companyName: string | null = null;
    let companyTaxId: string | null = null;
    if (body.accountType === "CORPORATE") {
      companyName = (body.companyName ?? "").trim().slice(0, 150);
      companyTaxId = (body.companyTaxId ?? "").trim();
      if (!companyName) {
        return NextResponse.json(
          { error: "Şirket adı zorunlu" },
          { status: 400 }
        );
      }
      if (country === "TR" && !isValidTrTaxIdFormat(companyTaxId)) {
        return NextResponse.json(
          { error: "Vergi numarası geçersiz" },
          { status: 400 }
        );
      }
    }

    // ── Persist ──────────────────────────────────────────────────────
    // Identity columns: only populated for individuals. Corporate rows
    // keep them null and carry identity via companyName + companyTaxId.
    const isIndividual = body.accountType === "INDIVIDUAL";
    const fullName = `${firstName} ${lastName}`.trim();
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName,
        phone,
        accountType: body.accountType,
        dateOfBirth: dob,
        country,
        nationalId: isIndividual && country === "TR"
          ? (body.nationalId ?? "").trim()
          : null,
        passportNo: isIndividual && country !== "TR"
          ? (body.passportNo ?? "").trim().toUpperCase()
          : null,
        companyName,
        companyTaxId,
        identityVerified: true,
        profileCompleted: true,
      },
      select: USER_SELECT,
    });

    return NextResponse.json(user);
  } catch (err: any) {
    if (err.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Profile update failed";
    logger.error("POST /api/auth/profile/complete failed", { error: message });
    return NextResponse.json(
      { error: "Profil güncellenemedi" },
      { status: 500 }
    );
  }
}
