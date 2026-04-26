import { NextRequest, NextResponse } from "next/server";

/// Bumping this string forces every user to re-accept the terms next
/// time they hit a write endpoint that gates on it. Keep monotonically
/// increasing (semver-ish). Major version when language meaningfully
/// changes; patch for typo / formatting fixes.
const TERMS_VERSION = "1.0";
const UPDATED_AT = "2026-04-26";

const TERMS_TR = `
# Sitevra Kullanıcı Sözleşmesi

**Yürürlük tarihi:** ${UPDATED_AT}
**Sürüm:** ${TERMS_VERSION}

## 1. Taraflar
İşbu sözleşme, "Sitevra" markası altında işletilen platformu kullanan
tüm gerçek ve tüzel kişiler (bundan sonra "Kullanıcı") ile platform
sahibi arasında akdedilmiştir.

## 2. Hizmet Tanımı
Sitevra, kullanıcılarına web sitesi oluşturma, düzenleme, yayınlama
ve özel alan adı bağlama hizmetleri sunan bir bulut platformudur.

## 3. Hesap ve Güvenlik
Kullanıcı, hesabına ait kullanıcı adı ve şifrenin gizliliğinden
sorumludur. Hesap üzerinden gerçekleştirilen tüm işlemler
Kullanıcı'ya aittir.

## 4. Yasak İçerik
Aşağıdaki içerikler kesinlikle yasaktır ve tespit edilmesi durumunda
hesap derhal askıya alınır:
- Türk hukukuna ve uluslararası hukuka aykırı içerikler
- Telif hakkı ihlali oluşturan içerikler
- Kişilik haklarına saldırı, hakaret, nefret söylemi
- Çocuk istismarı, şiddet ya da terör propagandası
- Kötü amaçlı yazılım, phishing veya dolandırıcılık siteleri
- İzinsiz toplanmış kişisel veri içeren içerikler

## 5. Ödeme ve Abonelik
Ücretli planlar Apple App Store veya Google Play üzerinden satın
alınır. Faturalama ve iade süreçleri ilgili mağazaların
politikalarına tabidir. Aboneliğiniz, iptal edilmedikçe otomatik
yenilenir.

## 6. Sözleşme Sona Ermesi
Kullanıcı, dilediği zaman hesabını kapatabilir. Hesap kapatıldıktan
sonra yayındaki siteler erişime kapatılır. Faturalama amacıyla
zorunlu yasal süreler saklı kalmak kaydıyla, kişisel veriler 30 gün
içinde silinir.

## 7. Sorumluluk Sınırları
Hizmet "olduğu gibi" sunulur. Sitevra, hizmet kesintileri,
veri kayıpları veya üçüncü taraf hizmetlerinin (mağaza, ödeme,
DNS) hatalarından kaynaklanan dolaylı zararlardan sorumlu değildir.

## 8. KVKK ve Veri İşleme
Kullanıcı verileri 6698 sayılı KVKK kapsamında işlenir. Veri sorumlusu
Sitevra'dır. Detaylı bilgi için Aydınlatma Metni'ne bakınız.

## 9. Değişiklikler
Bu sözleşme önceden haber verilmeksizin güncellenebilir. Esaslı
değişiklikler kullanıcıya uygulama içi bildirimle iletilir;
kullanmaya devam etmek için yeni sürümü kabul etmeniz gerekir.

## 10. Yetkili Mahkeme
Bu sözleşmeden doğan uyuşmazlıklarda İstanbul Mahkemeleri ve İcra
Daireleri yetkilidir.

---

İşbu sözleşmeyi kabul ettiğinizi, anladığınızı ve hükümleri ile
bağlı olmayı kabul ettiğinizi beyan edersiniz.
`.trim();

const TERMS_EN = `
# Sitevra Terms of Service

**Effective date:** ${UPDATED_AT}
**Version:** ${TERMS_VERSION}

## 1. Parties
This agreement is entered into between every individual and legal
entity (hereinafter the "User") who uses the platform operated under
the "Sitevra" brand and the platform owner.

## 2. Service
Sitevra is a cloud platform that lets users create, edit, publish and
attach custom domains to websites.

## 3. Account & Security
You are responsible for keeping your username and password
confidential. Any action taken from your account is treated as your
own.

## 4. Prohibited Content
The following content is strictly prohibited and will result in
immediate suspension if detected:
- Content that violates Turkish law or international law
- Copyright-infringing material
- Defamation, hate speech or attacks on personal rights
- Child exploitation, violent or terror-related content
- Malware, phishing or fraud sites
- Personal data collected without consent

## 5. Payments & Subscriptions
Paid plans are purchased through Apple App Store or Google Play.
Billing and refund processes are governed by the policies of those
stores. Your subscription renews automatically until cancelled.

## 6. Termination
You may close your account at any time. After closure, any published
sites are taken offline. Personal data is deleted within 30 days,
subject to mandatory legal retention periods (e.g. invoicing).

## 7. Limitation of Liability
The service is provided "as is". Sitevra is not liable for indirect
damages caused by service interruptions, data loss or failures of
third-party providers (stores, payment, DNS).

## 8. Data Processing (KVKK)
User data is processed under Turkish KVKK law no. 6698. Sitevra is
the data controller. See the Privacy Policy for details.

## 9. Changes
We may update this agreement without prior notice. Material changes
are surfaced via in-app notification; continued use requires
acceptance of the new version.

## 10. Governing Law
Any disputes arising from this agreement fall under the jurisdiction
of the courts and enforcement offices of Istanbul, Türkiye.

---

By creating an account you confirm that you have read, understood and
agree to be bound by these terms.
`.trim();

const VARIANTS: Record<string, { markdown: string; locale: string }> = {
  tr: { markdown: TERMS_TR, locale: "tr-TR" },
  en: { markdown: TERMS_EN, locale: "en-US" },
};

/// GET /api/legal/terms?locale=tr|en — public.
/// Returns the current terms-of-service markdown plus the version
/// string. Default locale is Turkish (the launch market). Unknown
/// locales fall back to English.
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("locale")?.toLowerCase();
  const lang = requested?.startsWith("tr") ? "tr" : requested?.startsWith("en") ? "en" : "tr";
  const v = VARIANTS[lang]!;
  return NextResponse.json({
    version: TERMS_VERSION,
    markdown: v.markdown,
    locale: v.locale,
    updatedAt: UPDATED_AT,
  });
}
