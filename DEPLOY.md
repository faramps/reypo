# Vercel'e Dağıtım Rehberi

Kod GitHub'a gönderildikten sonra izlenecek adımlar. (Kurulum/migration için
ayrıca bkz. `supabase/BOOTSTRAP.md`.)

## 1. Vercel projesi oluştur

1. https://vercel.com → **Add New → Project** → GitHub'daki `reypobackend`
   deposunu içe aktar.
2. Framework otomatik **Next.js** algılanır; build/output ayarlarına dokunma.

## 2. Ortam değişkenlerini gir

Vercel proje ayarları → **Settings → Environment Variables**. Tümünü
**Production + Preview + Development** kapsamında ekle (`.env.local` ile aynı
değerler):

| Değişken | Kaynak |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API ayarları (https://<ref>.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase API ayarları — anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API ayarları — service_role (gizli) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env.local`'deki değerle **aynı** |
| `VAPID_PRIVATE_KEY` | `.env.local`'deki değerle **aynı** |
| `VAPID_SUBJECT` | `mailto:tenekenett@gmail.com` |

VAPID anahtarları yereldekiyle aynı olmalı; yenisini üretirsen mevcut push
abonelikleri geçersiz olur. Deploy'a bas.

## 3. Supabase Auth URL'lerini prod adresine güncelle

Deploy sonrası Vercel bir URL verir (ör. `https://reypobackend.vercel.app`).
Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://<vercel-domaini>`
- **Redirect URLs** listesine ekle: `https://<vercel-domaini>/**`
  (localhost girdilerini yerel geliştirme için bırakabilirsin.)

Bu adım yapılmazsa davet ve şifre-sıfırlama linkleri prod'da kırılır.

## 4. E-posta sağlayıcısı (davet/sıfırlama e-postaları için)

Supabase free tier'ın yerleşik SMTP'si saatte ~2-4 e-posta ile sınırlıdır ve
şablon Türkçeleştirilemez. Birden fazla kişi davet edecekseniz özel SMTP şart:

1. https://resend.com (ücretsiz katman yeterli) → API key + domain doğrula.
2. Supabase → **Authentication → Emails → SMTP Settings** → Resend bilgilerini gir.
3. İstersen davet/sıfırlama şablonlarını Türkçeleştir (özel SMTP ile açılır).

## 5. PWA / iOS testi (yalnızca HTTPS'te çalışır)

Prod URL'i iPhone Safari'de aç → Paylaş → **Ana Ekrana Ekle** → uygulamayı aç →
Ayarlar → **Bildirimleri Aç** (izin ver). Başka bir hesaptan görev ata; kilit
ekranına push düşmeli. (Push iOS 16.4+ ve yalnızca ana ekrana eklenmiş PWA'da
çalışır.)

## Notlar

- Uygulama davet/sıfırlama yönlendirmesinde isteğin `host` başlığını kullanır;
  ayrı bir "site URL" ortam değişkenine gerek yoktur, her domainde çalışır.
- Yeni migration eklersen: `npx supabase db push` (SUPABASE_ACCESS_TOKEN ile).
