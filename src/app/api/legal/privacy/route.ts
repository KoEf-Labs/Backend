import { NextResponse } from "next/server";

/// Bumping this string forces every user to re-acknowledge the policy
/// next time they open the legal screen. Keep monotonically increasing.
const PRIVACY_VERSION = "1.0";

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

/// GET /api/legal/privacy — public. Returns the current privacy policy
/// markdown plus the version string. Mobile shows it inside the
/// register flow and the profile/about screen.
export async function GET() {
  return NextResponse.json({
    version: PRIVACY_VERSION,
    markdown: PRIVACY_TR,
    locale: "tr-TR",
    updatedAt: "2026-04-26",
  });
}
