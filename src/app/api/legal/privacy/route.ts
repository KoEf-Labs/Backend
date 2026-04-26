import { NextRequest, NextResponse } from "next/server";

/// Bumping this string forces every user to re-acknowledge the policy
/// next time they open the legal screen. Keep monotonically increasing.
const PRIVACY_VERSION = "1.0";
const UPDATED_AT = "2026-04-26";

const PRIVACY_TR = `
# Sitevra Gizlilik Sözleşmesi

**Yürürlük tarihi:** 2026-04-26
**Sürüm:** ${PRIVACY_VERSION}

## 1. Veri Sorumlusu
Bu metin kapsamında veri sorumlusu, "Sitevra" markası altında işletilen
platformun sahibidir. KVKK 6698 sayılı kanun kapsamında işlenen kişisel
veriler aşağıda açıklanmıştır.

## 2. Topladığımız Veriler

### 2.1 Hesap verileri
- Ad, soyad
- E-posta adresi
- Telefon numarası
- Profil fotoğrafı (opsiyonel)
- Doğum tarihi (yaş kontrolü için)
- Ülke bilgisi
- Kimlik / pasaport numarası (kimlik doğrulama için, hash'lenerek
  saklanır — düz metin olarak tutulmaz)
- Şirket adı, vergi numarası (kurumsal hesaplar için)

### 2.2 Site verileri
- Oluşturduğun site içerikleri (metin, görsel)
- Seçtiğin alt alan adı
- Yayın durumu, oluşturma/güncelleme tarihleri

### 2.3 Teknik veriler
- IP adresi (yalnızca güvenlik logları, 30 gün)
- Cihaz türü, işletim sistemi, uygulama sürümü
- Crash raporları (anonim — kullanıcıyla eşleştirilmez)

### 2.4 Ödeme verileri
Ödeme bilgilerin (kart numarası vb.) tarafımızca saklanmaz. Tüm
işlemler Apple App Store, Google Play, Stripe ve Iyzico üzerinden
yürütülür; biz yalnızca ödeme sağlayıcısının döndürdüğü işlem
referansını saklarız.

## 3. Veri İşleme Amaçları
- Hesap oluşturma ve yönetimi
- Yasal yükümlülükler (faturalama, KVKK)
- Hizmet kalitesini iyileştirme (anonim analitik)
- Güvenlik (kötüye kullanım tespiti, dolandırıcılık önleme)
- Sözleşmeden doğan yükümlülükler (sitenin yayınlanması, müşteri
  destek hizmetleri)

## 4. Üçüncü Taraflarla Paylaşım
Verilerin yalnızca aşağıdaki hizmet sağlayıcılarla, yalnızca hizmetin
gerektirdiği ölçüde paylaşılır:

| Sağlayıcı | Amaç | Veri |
|-----------|------|------|
| Apple App Store / Google Play | Abonelik | Ödeme onayı |
| Stripe | Web ödemeleri | Ödeme bilgisi (PCI uyumlu) |
| Iyzico | TR kart ödemeleri | Ödeme bilgisi |
| Hetzner | Sunucu altyapısı | Tüm veriler (Almanya, AB) |
| Cloudflare | CDN, DDoS koruması | IP, tarayıcı bilgisi |
| MERNIS (planlanan) | TC kimlik doğrulama | Kimlik no, ad-soyad |

Hiçbir kişisel verin reklam veya pazarlama amacıyla üçüncü taraflara
satılmaz.

## 5. Veri Saklama Süresi
- Aktif hesap: hesap silinene kadar
- Pasif hesap (12 ay giriş yok): otomatik anonimleştirme
- Faturalama kayıtları: 10 yıl (yasal zorunluluk)
- Güvenlik logları: 30 gün
- Crash raporları: 90 gün

## 6. KVKK Hakların
6698 sayılı KVKK kapsamında aşağıdaki haklara sahipsin:
- Kişisel verilerinin işlenip işlenmediğini öğrenme
- İşlenen verilerin amacını ve uygun kullanılıp kullanılmadığını öğrenme
- Eksik/yanlış verilerin düzeltilmesini isteme
- Verilerin silinmesini veya yok edilmesini isteme
- Bu işlemlerin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme
- İşlemlerin sonuçlarının ortaya çıkmasına itiraz etme
- Zarara uğraman halinde tazminat talep etme

Bu haklarını kullanmak için: **kvkk@sitevra.com** adresine yazılı
talep gönderebilirsin. 30 gün içinde yanıtlanır.

## 7. Çerezler
Mobil uygulama çerez kullanmaz. Web sitesi (sitevra.com) yalnızca
fonksiyonel çerez kullanır — analitik ve reklam çerezi yoktur.

## 8. Çocuklar
Hizmet 18 yaşından küçüklere yönelik değildir. 18 yaş altı kullanıcı
tespit edilirse hesap derhal kapatılır ve veriler silinir.

## 9. Uluslararası Veri Aktarımı
Sunucularımız Almanya'da (Hetzner) bulunur — AB GDPR koruması altındadır.
Türkiye'den AB'ye veri aktarımı KVKK 9. madde kapsamında yapılır.

## 10. Veri İhlali Bildirimi
Bir veri ihlali yaşanması durumunda KVKK Kurumu'na 72 saat içinde,
etkilenen kullanıcılara da en kısa sürede bildirim yapılır.

## 11. Değişiklikler
Bu metin önceden haber verilmeksizin güncellenebilir. Esaslı
değişiklikler uygulama içi bildirimle iletilir.

## 12. İletişim
- **KVKK / veri sorumlusu:** kvkk@sitevra.com
- **Genel destek:** destek@sitevra.com
`.trim();

const PRIVACY_EN = `
# Sitevra Privacy Policy

**Effective date:** ${UPDATED_AT}
**Version:** ${PRIVACY_VERSION}

## 1. Data Controller
Within the scope of this document the data controller is the owner of
the platform operated under the "Sitevra" brand. Personal data is
processed under Turkish KVKK law no. 6698; if you are an EU resident,
GDPR principles also apply.

## 2. Data We Collect

### 2.1 Account data
- First and last name
- Email address
- Phone number
- Profile picture (optional)
- Date of birth (age check)
- Country
- National ID / passport number (for identity verification — stored
  hashed, never in plain text)
- Company name and tax ID (for corporate accounts)

### 2.2 Site data
- Content of the sites you create (text, images)
- Chosen subdomain
- Publication status, created/updated timestamps

### 2.3 Technical data
- IP address (security logs only, 30 days)
- Device type, OS, app version
- Crash reports (anonymous — not linked to a user)

### 2.4 Payment data
We do not store your payment instrument (card number, etc.). All
transactions go through Apple App Store, Google Play, Stripe and
Iyzico; we only keep the transaction reference returned by the
provider.

## 3. Why We Process It
- Account creation and management
- Legal obligations (invoicing, KVKK)
- Service quality (anonymous analytics)
- Security (abuse detection, fraud prevention)
- Contractual obligations (publishing your site, customer support)

## 4. Sharing With Third Parties
Data is shared only with the following service providers, only as
needed for the service:

| Provider | Purpose | Data |
|----------|---------|------|
| Apple App Store / Google Play | Subscription | Payment confirmation |
| Stripe | Web payments | Payment data (PCI compliant) |
| Iyzico | TR card payments | Payment data |
| Hetzner | Server infrastructure | All data (Germany, EU) |
| Cloudflare | CDN, DDoS protection | IP, browser info |
| MERNIS (planned) | TC ID verification | National ID, name |

We never sell your personal data for advertising or marketing.

## 5. Retention
- Active account: until the account is deleted
- Inactive account (no login for 12 months): automatic anonymisation
- Billing records: 10 years (legal requirement)
- Security logs: 30 days
- Crash reports: 90 days

## 6. Your KVKK / GDPR Rights
You can:
- Find out whether your data is being processed
- Learn the purpose of processing and whether it is being used appropriately
- Request correction of incomplete or wrong data
- Request deletion or destruction
- Have those changes communicated to third parties the data was shared with
- Object to outcomes of automated processing
- Claim damages if any harm has been caused

To exercise these rights write to **kvkk@sitevra.com**. We answer
within 30 days.

## 7. Cookies
The mobile app uses no cookies. The web site (sitevra.com) uses
functional cookies only — no analytics or advertising cookies.

## 8. Children
The service is not intended for users under 18. If we discover such
an account it is closed and the data is deleted.

## 9. International Transfers
Our servers are located in Germany (Hetzner) — under EU GDPR
protection. Transfers from Türkiye to the EU are made under KVKK
art. 9.

## 10. Breach Notification
If a data breach occurs we notify the KVKK authority within 72 hours
and the affected users as soon as possible.

## 11. Changes
This policy may be updated without prior notice. Material changes are
surfaced via in-app notification.

## 12. Contact
- **KVKK / data controller:** kvkk@sitevra.com
- **General support:** destek@sitevra.com
`.trim();

const VARIANTS: Record<string, { markdown: string; locale: string }> = {
  tr: { markdown: PRIVACY_TR, locale: "tr-TR" },
  en: { markdown: PRIVACY_EN, locale: "en-US" },
};

/// GET /api/legal/privacy?locale=tr|en — public. Returns the current
/// privacy policy markdown plus the version string. Default locale is
/// Turkish (the launch market). Unknown locales fall back to Turkish.
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get("locale")?.toLowerCase();
  const lang = requested?.startsWith("en") ? "en" : "tr";
  const v = VARIANTS[lang]!;
  return NextResponse.json({
    version: PRIVACY_VERSION,
    markdown: v.markdown,
    locale: v.locale,
    updatedAt: UPDATED_AT,
  });
}
