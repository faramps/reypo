# Ofis Görev Takip Sistemi — Geliştirme Planı

> **Bu doküman ne?** Ofis içi görev takibi için iPhone ağırlıklı kullanılacak, PWA olarak kurulabilen bir web uygulamasının uçtan uca geliştirme planı. Kodlamaya bu plana göre başlanacak; henüz hiçbir uygulama kodu yazılmadı (repo taze `create-next-app` çıktısı).

> **⚠️ Kodlayacak model için kritik uyarı:** Bu proje **Next.js 16.2.10** kullanıyor ve eğitim verinizdeki Next.js'ten farklı olabilir. Kod yazmadan önce `node_modules/next/dist/docs/` altındaki ilgili rehberi okuyun (AGENTS.md'nin talimatı). Bu plandaki "Next.js 16 Farkları" bölümü en kritik olanları özetliyor ama tek kaynak dokümanlardır.

---

## 1. Ürün Özeti

Ofis çalışanları için görev takip uygulaması:

- **Yöneticiler:** Yeni iş rolü tanımlar ("yazılımcı", "tasarımcı" gibi), proje oluşturur, projeler altında kullanıcılara görev atar.
- **Kullanıcılar:** Kendisine görev atandığında bildirim alır, görev tanımını okur, "Tamamladım" der.
- **Platform:** Mobil öncelikli (iPhone yoğunluklu), ana ekrana eklenen PWA olarak kullanılacak. Masaüstünde de çalışmalı (responsive).
- **Backend:** Supabase (Auth + Postgres + RLS + Realtime). Frontend/sunucu: Next.js 16 (App Router).

### Kavram ayrımı (önemli!)

İki farklı "rol" kavramı var, karıştırılmamalı:

1. **Sistem rolü** (`admin` | `member`): Yetki belirler. Admin panelini kimin görebileceğini, kimin proje/görev/rol oluşturabileceğini kontrol eder. Sabittir, enum'dur.
2. **İş rolü** (dinamik, `roles` tablosu): "Yazılımcı", "Tasarımcı" gibi. Adminler yenisini ekleyebilir. Görev atarken kullanıcıları filtrelemek/gruplamak ve görevleri kategorize etmek için kullanılır.

### Görev atama modeli (karar)

Görev **her zaman belirli bir kullanıcıya** atanır (`assignee_id`). Görevde ayrıca opsiyonel bir `role_id` tutulur (görevin hangi iş rolüyle ilgili olduğu — atama ekranında admin önce rol seçip o roldeki kullanıcıları filtreleyebilir). "Role atanan görevi o roldeki herkes görür" modeli **bilinçli olarak kapsam dışı** bırakıldı; ihtiyaç olursa Faz 2'de `assignee_id NULL + role_id dolu = rol havuzu görevi` olarak eklenebilir.

---

## 2. Teknoloji Yığını

| Katman | Seçim | Not |
|---|---|---|
| Framework | Next.js 16.2.10, App Router | Zaten kurulu; Turbopack varsayılan |
| UI | React 19.2 + Tailwind CSS v4 | Tailwind v4: CSS-first config (`@theme`), `tailwind.config.js` yok |
| Bileşen kütüphanesi | shadcn/ui (Tailwind v4 destekli) | Alternatif: saf Tailwind. Ağır UI kitleri (MUI vb.) kullanma |
| Backend | Supabase: Auth, Postgres, RLS, Realtime | Tüm veri erişimi RLS arkasında |
| Supabase istemcileri | `@supabase/supabase-js` + `@supabase/ssr` | SSR paketi cookie tabanlı oturum için şart |
| Push bildirim | Web Push API + `web-push` npm paketi (VAPID) | iOS 16.4+ yalnızca ana ekrana eklenmiş PWA'da çalışır |
| Dil | TypeScript strict | Supabase tip üretimi: `supabase gen types typescript` |

### Kurulacak paketler

```bash
npm i @supabase/supabase-js @supabase/ssr web-push
npm i -D @types/web-push supabase
# shadcn/ui tercih edilirse:
npx shadcn@latest init
```

### Ortam değişkenleri (`.env.local` — repoya girmez)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # SADECE sunucu tarafında; asla client'a sızmamalı
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tenekenett@gmail.com
```

VAPID anahtarları: `npx web-push generate-vapid-keys`

---

## 3. Next.js 16 Farkları (kodlayacak model bunları BİLMELİ)

Bunlar `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` ve ilgili rehberlerden doğrulandı:

1. **`middleware.ts` yok, artık `proxy.ts`.** Proje kökünde `proxy.ts` oluşturulur, fonksiyon adı `proxy` (veya default export). Supabase'in resmi SSR dokümanları "middleware" der — aynı kod `proxy.ts`'e uyarlanacak. Proxy oturum yenilemek (token refresh) için kullanılır, tam yetkilendirme çözümü olarak DEĞİL.
2. **Request API'leri async:** `cookies()`, `headers()`, `params`, `searchParams` hepsi `await` ister. `@supabase/ssr` server client'ı kurarken `const cookieStore = await cookies()`.
3. **Turbopack varsayılan** (dev ve build). Webpack'e özel config yazma.
4. **Caching API'leri değişti:** `revalidateTag(tag, 'max')` profili ister; `updateTag` ve `refresh` eklendi. Bu projede veri çoğunlukla dinamik (kullanıcıya özel) olduğundan sayfalar dinamik render edilecek; agresif cache kullanma.
5. **`next lint` kaldırıldı** — ESLint doğrudan çalışıyor (package.json'da zaten `"lint": "eslint"`), flat config (`eslint.config.mjs`) kullanılıyor.
6. **`next/image`:** local IP kısıtı, `qualities`/`imageSizes` varsayılanları değişti. Bu projede kritik değil (avatar dışında görsel az).
7. Şüphe duyulan her API için önce `node_modules/next/dist/docs/` altına bak.

---

## 4. Veritabanı Şeması (Supabase / Postgres)

Migration'lar `supabase/migrations/` altında SQL dosyaları olarak tutulacak (Supabase CLI). Aşağıdaki şema ilk migration'ın taslağı:

```sql
-- ENUM'lar
create type system_role as enum ('admin', 'member');
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'normal', 'high', 'urgent');
create type notification_type as enum ('task_assigned', 'task_completed', 'task_updated');

-- Profiller (auth.users'a 1:1)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  system_role system_role not null default 'member',
  role_id uuid references public.roles(id) on delete set null,  -- iş rolü
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Dinamik iş rolleri (yazılımcı, tasarımcı, ...)
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,                      -- UI'da rozet rengi
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Projeler
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Görevler
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,                -- görev tanımı (markdown desteklenebilir)
  status task_status not null default 'todo',
  priority task_priority not null default 'normal',
  assignee_id uuid not null references public.profiles(id),
  role_id uuid references public.roles(id) on delete set null,  -- opsiyonel kategori
  due_date date,
  created_by uuid not null references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (assignee_id, status);
create index on public.tasks (project_id);

-- Uygulama içi bildirimler
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  task_id uuid references public.tasks(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, is_read);

-- Web Push abonelikleri (bir kullanıcının birden çok cihazı olabilir)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
```

Notlar:
- `roles` tablosu `profiles`'tan önce oluşturulmalı (FK sırası) veya FK sonradan `alter table` ile eklenmeli.
- `handle_new_user` trigger'ı: `auth.users`'a insert olduğunda `profiles` satırı otomatik açılır (Supabase klasik deseni).
- `updated_at` için `moddatetime` extension veya basit trigger.
- **İlk admin bootstrap:** İlk kullanıcı Supabase Dashboard'dan oluşturulur, `system_role` elle `admin` yapılır (tek seferlik SQL). Sonraki kullanıcıları admin panelden davet eder.

### RLS Politikaları (özet — hepsi `enable row level security` ile)

| Tablo | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | Giriş yapmış herkes (isim/rol görünmeli) | trigger ile (kendi) | Kendi satırı: sadece `full_name`, `avatar_url`. Admin: hepsi | Sadece admin |
| roles | Giriş yapmış herkes | Sadece admin | Sadece admin | Sadece admin |
| projects | Giriş yapmış herkes (küçük ofis varsayımı) | Sadece admin | Sadece admin | Sadece admin |
| tasks | Admin: hepsi. Member: `assignee_id = auth.uid()` | Sadece admin | Admin: her alan. Member: kendi görevi ve **yalnızca** `status`/`completed_at` | Sadece admin |
| notifications | `user_id = auth.uid()` | Sunucu tarafı (service role) | Kendi satırı: sadece `is_read` | Kendi satırı |
| push_subscriptions | `user_id = auth.uid()` | Kendi adına | Kendi satırı | Kendi satırı |

Admin kontrolü için `security definer` yardımcı fonksiyon (RLS içinde recursion'ı önler):

```sql
create or replace function public.is_admin()
returns boolean language sql security definer stable
as $$ select exists(select 1 from public.profiles where id = auth.uid() and system_role = 'admin') $$;
```

Member'ın task update'te yalnızca status değiştirebilmesi RLS ile alan bazında kısıtlanamaz; iki seçenek: (a) `WITH CHECK` + trigger ile eski/yeni satır karşılaştırması, (b) mutasyonu Server Action üzerinden yapıp client'tan doğrudan update'i kapatmak. **Karar: (b)** — tüm yazma işlemleri Server Action'dan geçecek, RLS ikinci savunma hattı.

---

## 5. Bildirim Mimarisi

İki katman:

### 5.1 Uygulama içi bildirim (temel, her cihazda çalışır)
- Görev atandığında Server Action, `notifications` tablosuna satır ekler.
- Client, Supabase **Realtime** ile kendi `notifications` satırlarına subscribe olur → zil ikonunda canlı rozet + bildirim listesi sayfası.
- Okundu işaretleme: satıra tıklayınca `is_read = true`.

### 5.2 Web Push (iPhone için asıl istek)
- **iOS gerçekleri:** Push yalnızca **iOS 16.4+** ve uygulama **ana ekrana eklenmişse** çalışır. İzin istemi **kullanıcı jesti** (butona dokunma) içinde tetiklenmeli. Safari sekmesinde push YOK.
- Akış:
  1. Kullanıcı ayarlar/onboarding ekranında "Bildirimleri Aç" butonuna basar.
  2. `navigator.serviceWorker.register('/sw.js')` + `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })`.
  3. Abonelik Server Action ile `push_subscriptions` tablosuna yazılır.
  4. Görev atayan Server Action: notification satırı + atanan kullanıcının **tüm** aboneliklerine `web-push` ile push gönderir. `410 Gone` dönen abonelikler tablodan silinir.
- `public/sw.js`: `push` event → `showNotification`; `notificationclick` → ilgili görev sayfasını aç (`clients.openWindow('/tasks/' + id)`).
- Push gönderimi Next.js sunucusunda (`web-push` paketi) yapılır. Supabase Edge Function alternatifi var ama gereksiz karmaşıklık — tek sunucu yeter. (İleride görev hatırlatıcıları gibi zamanlanmış push gerekirse Edge Function + pg_cron eklenir.)
- Onboarding'de iOS kullanıcısına "Önce paylaş menüsünden Ana Ekrana Ekle" yönlendirmesi gösterilir (standalone değilse; `display-mode: standalone` media query ile tespit).

---

## 6. PWA Gereksinimleri

- `app/manifest.ts` (Next'in yerleşik manifest desteği): `name`, `short_name`, `display: 'standalone'`, `start_url: '/'`, `theme_color`, `background_color`, 192/512 ikonlar + `apple-touch-icon` (180×180, `public/` içinde ve layout metadata'sında).
- `public/sw.js`: push + notificationclick (yukarıda). Offline cache Faz 1'de kapsam dışı; istenirse ileride Serwist eklenir (not: webpack config ister, Turbopack ile uyum kontrol edilmeli — bu yüzden ertelendi).
- **iOS görsel uyum:**
  - `viewport-fit=cover` + CSS `env(safe-area-inset-*)` padding'leri (özellikle alt tab bar ve üst başlık).
  - Dokunma hedefleri min 44×44pt; hover'a dayalı hiçbir etkileşim olmayacak.
  - `-webkit-tap-highlight-color` ve input zoom'u önlemek için form elemanlarında `font-size: 16px` altına inme.
  - Status bar rengi için `theme_color` + `apple-mobile-web-app-status-bar-style`.
- Service worker'a `Cache-Control: no-cache` header'ı (`next.config.ts` → `headers()`), PWA rehberindeki güvenlik header'ları eklenecek.
- HTTPS zorunlu (yerel test: `next dev --experimental-https`).

---

## 7. Sayfa Haritası ve Dosya Yapısı

Mobil öncelikli düzen: altta 3-4 sekmeli tab bar (Görevlerim / Projeler / Bildirimler / Profil), admin'e ek "Yönetim" girişi. Masaüstünde tab bar yana yaslanır (sidebar) — tek layout, CSS breakpoint ile.

```
proxy.ts                          # Supabase oturum yenileme (middleware DEĞİL!)
app/
  manifest.ts                     # PWA manifest
  layout.tsx                      # kök layout, viewport/theme metadata
  globals.css                     # Tailwind v4 @theme tokenlar, safe-area utilities
  (auth)/
    login/page.tsx                # e-posta+şifre giriş (kayıt YOK; davetle üyelik)
  (app)/                          # oturum korumalı grup
    layout.tsx                    # tab bar / sidebar, realtime bildirim provider
    page.tsx                      # "Görevlerim" — varsayılan ekran (status'a göre gruplu)
    tasks/[id]/page.tsx           # görev detayı + "Tamamladım" butonu
    projects/page.tsx             # proje listesi
    projects/[id]/page.tsx        # proje detayı + görev listesi (admin: görev ekle)
    notifications/page.tsx        # bildirim listesi
    settings/page.tsx             # profil + push aboneliği yönetimi + PWA kurulum rehberi
    admin/
      page.tsx                    # yönetim özeti
      roles/page.tsx              # iş rolü CRUD
      users/page.tsx              # kullanıcı davet + rol atama
  api/                            # (gerekirse) route handlers; öncelik Server Actions
lib/
  supabase/
    client.ts                     # browser client (@supabase/ssr createBrowserClient)
    server.ts                     # server client (await cookies())
    admin.ts                      # service-role client (SADECE server; davet & push için)
    types.ts                      # supabase gen types çıktısı
  actions/
    tasks.ts                      # createTask, completeTask, updateTask (use server)
    roles.ts, projects.ts, users.ts, notifications.ts, push.ts
  push.ts                         # web-push sarmalayıcı (VAPID config, sendToUser)
components/
  ui/                             # shadcn bileşenleri
  task-card.tsx, tab-bar.tsx, notification-bell.tsx, install-prompt.tsx ...
public/
  sw.js
  icons/ (192, 512, apple-touch-icon-180)
supabase/
  migrations/                     # SQL migration'lar
  seed.sql                        # örnek roller/veri (dev)
```

### Kimlik doğrulama akışı
- Kayıt ekranı yok; **davet modeli**: Admin, "Kullanıcılar" ekranından e-posta girer → server-side `supabase.auth.admin.inviteUserByEmail()` (service role) → kullanıcı e-postadaki linkle şifresini belirler.
- `proxy.ts` her istekte token'ı yeniler; `(app)` grubunun layout'unda `getUser()` kontrolü, yoksa `/login`'e redirect. Admin sayfaları ayrıca `system_role` kontrolü (hem UI'da hem her admin Server Action'ın başında).

---

## 8. Geliştirme Fazları

Her faz çalışır, test edilebilir bir dilim üretir. Sırayla gidilmeli.

### Faz 0 — Altyapı (½ gün)
- Supabase projesi aç (bölge: eu-central önerilir), CLI kur, `supabase init` + `supabase link`.
- Paketleri kur, `.env.local` doldur, VAPID üret.
- shadcn/ui init, Tailwind v4 temel tema (`globals.css` içinde `@theme`).
- **Kabul:** `npm run dev` açılıyor, Supabase'e bağlanılıyor.

### Faz 1 — Şema + Auth (1 gün)
- Migration: tüm tablolar, enum'lar, trigger'lar, RLS politikaları, `is_admin()`.
- `proxy.ts` + Supabase client'ları (`client/server/admin`).
- `/login` sayfası, `(app)` koruması, çıkış.
- İlk admin'i elle oluştur (dashboard + SQL).
- **Kabul:** Admin girip boş dashboard'u görüyor; oturumsuz istek login'e düşüyor; RLS'i SQL editöründen anon key ile test et (başka kullanıcının task'ı SELECT edilememeli).

### Faz 2 — Yönetim: Roller + Kullanıcılar (1 gün)
- `/admin/roles`: iş rolü ekle/düzenle/sil (silme: kullanılan rol için engelle veya null'a düşür).
- `/admin/users`: davet gönder, kullanıcıya iş rolü ata, sistem rolü değiştir.
- **Kabul:** Admin "tasarımcı" rolünü ekleyip bir kullanıcı davet edebiliyor; davet e-postası çalışıyor; member `/admin`'e giremiyor (redirect).

### Faz 3 — Projeler + Görev Atama (1–1,5 gün)
- Proje CRUD (admin), proje listesi/detayı (herkes).
- Görev oluşturma formu: başlık, açıklama, öncelik, son tarih, iş rolü seç → o roldeki kullanıcılar filtrelenir → atanan seçilir.
- Görev oluşturunca `notifications` satırı da yazılır (push henüz yok).
- **Kabul:** Admin proje açıp görev atıyor; member yalnızca kendi görevlerini listede görüyor.

### Faz 4 — Kullanıcı Görev Akışı (1 gün)
- "Görevlerim" ekranı: durum gruplu (Bekleyen / Devam Eden / Tamamlanan), önceliğe göre sıralı.
- Görev detayı: tanım, proje, son tarih; "Başladım" (opsiyonel) ve "Tamamladım" butonları.
- Tamamlanınca admin'e `task_completed` bildirimi.
- **Kabul:** Member görevi tamamlıyor, admin proje ekranında güncel durumu görüyor.

### Faz 5 — Uygulama İçi Bildirimler (½–1 gün)
- Realtime subscription (notifications, kendi user_id filtresiyle) → tab bar'da rozet.
- `/notifications` listesi, okundu işaretleme, bildirime dokununca göreve gitme.
- **Kabul:** İki tarayıcıda iki kullanıcıyla canlı test: atama anında rozet düşüyor.

### Faz 6 — PWA + Web Push (1–1,5 gün)
- `app/manifest.ts`, ikonlar, `public/sw.js`, güvenlik header'ları.
- Settings'te "Bildirimleri Aç" akışı + abonelik kaydı; görev atama/tamamlama action'larına push gönderimi eklenir; 410 temizliği.
- iOS install yönlendirme bileşeni (standalone değilse göster).
- **Kabul:** Gerçek iPhone'da (iOS 16.4+): ana ekrana ekle → bildirim izni ver → başka hesaptan görev ata → kilit ekranına push düşüyor → dokununca görev açılıyor.

### Faz 7 — Cila + Dağıtım (1 gün)
- iPhone SE/14/15 + iPad + masaüstü genişliklerinde responsive tarama; safe-area, klavye açılma, uzun metin taşmaları.
- Boş durumlar, yükleme iskeletleri, hata mesajları (Türkçe).
- Vercel'e deploy (HTTPS otomatik), Supabase prod ayarları: Site URL, redirect URL'ler, davet e-posta şablonu (Türkçe).
- **Kabul:** Prod URL üzerinden uçtan uca senaryo: davet → kurulum → atama → push → tamamlama.

**Toplam kaba tahmin:** ~6–8 geliştirme günü.

---

## 9. Tasarım İlkeleri

- **Mobile-first:** Önce 390px genişlik için tasarla, sonra `md:`/`lg:` ile genişlet. Tab bar altta (`position: fixed` + safe-area padding), masaüstünde sol sidebar'a dönüşür.
- Kart bazlı görev listesi; durum ve öncelik renkli rozetlerle (iş rolü rozeti `roles.color`).
- Tek el kullanımı: birincil aksiyonlar ekranın alt yarısında; "Tamamladım" görev detayında sabit alt buton.
- Sistem fontu (`-apple-system` yığını) — iOS'ta doğal his + performans.
- ~~Koyu mod: `prefers-color-scheme` ile otomatik~~ **Karar değişikliği (2026-07-09):** Uygulama yalnızca aydınlık tema kullanır, koyu mod kaldırıldı. Masaüstünde navigasyon sol sidebar'dadır, mobilde alt sekme çubuğu.
- Dil: Arayüz tamamen Türkçe.

---

## 10. Güvenlik Kontrol Listesi

- [ ] `SUPABASE_SERVICE_ROLE_KEY` yalnızca `lib/supabase/admin.ts` içinde; bu dosya hiçbir client component'ten import edilmiyor (`server-only` paketi ile işaretle).
- [ ] Tüm tablolarda RLS aktif; anon key ile yetkisiz erişim testi yapıldı.
- [ ] Her admin Server Action'ı ilk satırda `is_admin` doğruluyor (UI kontrolüne güvenme).
- [ ] Proxy sadece token yeniler; yetkilendirme sayfa/action seviyesinde.
- [ ] `sw.js` için no-cache header; PWA rehberindeki güvenlik header'ları ekli.
- [ ] Push payload'ında hassas veri yok (sadece başlık + görev id).

## 11. Kesinleşen Kararlar (ürün sahibiyle netleştirildi — 2026-07-08)

Aşağıdaki dört karar ürün sahibine soruldu ve kesinleşti. **Kodlama sırasında bunlar tartışmaya açılmaz**, plan bu kararlara göre yazılmıştır:

1. ~~**Onay akışı yok:** Kullanıcı "Tamamladım" dediğinde görev direkt `done` olur.~~ **Karar değişikliği (2026-07-11): Onay akışı EKLENDİ.** Çalışan "Tamamladım" dediğinde görev `awaiting_approval` (Onay Bekliyor) durumuna geçer ve yöneticilere bildirim gider. Yönetici ya **onaylar** (→ `done`) ya da **revize ister** (→ `revision`, not zorunlu, çalışana bildirim). Çalışan düzeltip yeniden gönderir; döngü onaya kadar sürer. Onay/revize turları `task_revisions` tablosunda geçmiş olarak tutulur (RLS ile assignee↔yönetici arasında gizli). Görevler zaten yalnızca atanan kişi + yöneticiler tarafından görülebilir (RLS `tasks_select_own_or_admin`). Migration: `supabase/migrations/20260711120000_approval_workflow.sql`.
2. **Tek iş rolü:** Her kullanıcının tek iş rolü vardır (`profiles.role_id`). `user_roles` junction tablosu YOK.
3. **Yorum ve dosya eki ilk sürümde YOK:** Çekirdek akış (atama → bildirim → tamamlama) önceliklidir. İleride istenirse: `task_comments` tablosu + Supabase Storage (ayrı bir ürün turu).
4. **Herkes tüm projeleri görür:** Küçük ofis modeli; proje ve görev listeleri tüm giriş yapmış kullanıcılara açık, ancak member yalnızca kendine atanan görevin durumunu değiştirebilir. `project_members` tablosu YOK. (Şema ve RLS bölümleri zaten bu modele göredir.)

5. **Başlangıç günü + yönetici takvimi (2026-07-11):** Göreve `tasks.start_date` (planlanan gün) eklendi. Karar: görev atanır atanmaz görünür ve bildirim hemen gider; `start_date` yalnızca planlama etiketidir (görünürlüğü ertelemez, cron gerektirmez). Yönetici `/admin/calendar` sayfasında aylık takvimde günleri görür, bir güne dokunup o gün için (proje + kişi seçerek) görev atar; mevcut görevler `start_date`'lerine göre takvimde görünür. Migration: `supabase/migrations/20260711130000_task_start_date.sql`.
