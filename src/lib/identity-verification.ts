/**
 * Identity verification — gateway for government / passport validation.
 *
 * Today this is a stub: all calls return { valid: true } unless the input
 * fails obvious local format checks. When we integrate the real services
 * (MERNIS SOAP for TR citizens, passport validation for others) only the
 * implementation of the two verify* functions changes; callers don't.
 *
 * Policy: if verification fails, the user cannot complete their profile,
 * and without a completed profile they cannot access the dashboard.
 */

export interface MernisInput {
  nationalId: string; // 11 digits
  firstName: string;
  lastName: string;
  birthYear: number; // 4-digit year
}

export interface PassportInput {
  passportNo: string;
  country: string; // ISO-2
  firstName: string;
  lastName: string;
  birthYear: number;
}

export interface VerifyResult {
  valid: boolean;
  // When the real service rejects, we'll fill this so the UI can show a
  // reason. Today it's always undefined (stub).
  reason?: string;
}

/**
 * TR nationalId format + checksum. This guards the real-service call from
 * obviously garbage input and stays useful even when MERNIS is live.
 */
export function isValidTrNationalIdFormat(id: string): boolean {
  if (!/^[1-9]\d{10}$/.test(id)) return false;
  const d = id.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = ((odd * 7 - even) % 10 + 10) % 10;
  if (d10 !== d[9]) return false;
  const sumFirst10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return sumFirst10 % 10 === d[10];
}

export function isValidPassportFormat(passportNo: string): boolean {
  // Broad format — ICAO passports are alphanumeric, 6-9 chars.
  return /^[A-Z0-9]{6,9}$/.test(passportNo.toUpperCase());
}

export function isValidTrTaxIdFormat(taxId: string): boolean {
  // GİB vergi no: 10 digits with a checksum algorithm.
  if (!/^\d{10}$/.test(taxId)) return false;
  const digits = taxId.split("").map(Number);
  const v = [];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const t = (digits[i] + (9 - i)) % 10;
    v[i] = t === 0 ? 0 : (t * 2 ** (9 - i)) % 9 || 9;
    sum += v[i];
  }
  const check = (10 - (sum % 10)) % 10;
  return check === digits[9];
}

/**
 * Placeholder for MERNIS (NVI TCKimlikNoDogrula SOAP). Real call will POST
 * to https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx.
 */
export async function verifyMernis(input: MernisInput): Promise<VerifyResult> {
  if (!isValidTrNationalIdFormat(input.nationalId)) {
    return { valid: false, reason: "TC kimlik numarası geçersiz" };
  }
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return { valid: false, reason: "Ad ve soyad zorunlu" };
  }
  if (input.birthYear < 1900 || input.birthYear > new Date().getFullYear()) {
    return { valid: false, reason: "Doğum yılı geçersiz" };
  }
  // TODO(mernis): replace with real SOAP call when NVI creds/rate-limit
  // policy are finalized. Today we approve any well-formed request.
  return { valid: true };
}

/**
 * Placeholder for passport validation. There is no universal passport API;
 * we'll likely defer to a manual document upload flow for real-world use.
 */
export async function verifyPassport(
  input: PassportInput
): Promise<VerifyResult> {
  if (!isValidPassportFormat(input.passportNo)) {
    return { valid: false, reason: "Pasaport numarası geçersiz" };
  }
  if (!/^[A-Z]{2}$/.test(input.country)) {
    return { valid: false, reason: "Ülke kodu geçersiz" };
  }
  // TODO(passport): wire to document-upload / partner KYC provider.
  return { valid: true };
}
