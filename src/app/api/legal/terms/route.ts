import { NextResponse } from "next/server";

/// Bumping this string forces every user to re-accept the terms next
/// time they hit a write endpoint that gates on it. Keep monotonically
/// increasing (semver-ish). Major version when language meaningfully
/// changes; patch for typo / formatting fixes.
const TERMS_VERSION = "1.0";

const TERMS_TR = `
# Sitevra Kullanıcı Sözleşmesi

**Yürürlük tarihi:** 2026-04-26
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

/// GET /api/legal/terms — public. Returns the current terms-of-service
/// markdown plus the version string. Mobile shows the modal at signup;
/// the admin panel reads this for the "user agreement" tab.
export async function GET() {
  return NextResponse.json({
    version: TERMS_VERSION,
    markdown: TERMS_TR,
    locale: "tr-TR",
    updatedAt: "2026-04-26",
  });
}
