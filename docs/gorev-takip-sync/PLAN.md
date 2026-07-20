# Görev Takip (reypobackend) senkron planı — YARIM, devam edilecek

Başka bir bilgisayardan devam etmek için bırakılan hand-off. Bu klasör repoda
(`docs/gorev-takip-sync/`) olduğu için git ile taşınır. Yanında hazır patch var:
`reypobackend-v2.1-to-bizededon.patch`.

## Durum / amaç
reypo'nun `/app/*` altındaki Görev Takip uygulaması, **reypobackend**'in
`v2.1` (`30bf632`, 11 Tmz) halinden birleştirilmiş. Aradan **3 commit** kaçmış:
`rangerover` (`b8834ff`) + `zafergazoz` (`49c1fb0`) + `bizededon` (`d04fcc1`, 14 Tmz).
Bu güncellemeyi **/app uyarlamalarını bozmadan** reypo'ya taşımak gerekiyor.

- Kaynak repo: `D:\soft\reypobackend` (kendi git repo'su). Merge kaynağı = `30bf632`, hedef = `d04fcc1`.
- **DB şeması DEĞİŞMEMİŞ** — migrationlar birebir aynı, yeni migration/seed YOK. Supabase'e dokunma.
- reypobackend başka bilgisayarda yoksa: yanındaki `.patch` dosyası tüm değişikliği içerir (referans).

## Uyarlama kuralı (merge sırasında korunacak)
reypobackend rotaları `app/(app)/*` (URL kök seviye). reypo'da bunlar `app/app/*`
(URL `/app/*`). Yani taşırken:
- Yol eşlemesi: `app/(app)/X` → `app/app/X`. `(auth)` ve kök dosyalar (`globals.css`, `layout.tsx`) aynı yolda.
- İçerideki task-app URL'leri `/app` önekli olmalı: `href="/projects"` → `/app/projects`,
  `redirect("/")` → `/app`, `revalidatePath("/calendar")` → `/app/calendar` vb.
  **Güncellemenin EKLEDİĞİ yeni linkler de öneklensin.**
- Tema route-group bazlı: `(marketing)` koyu, `(app)` açık — bunu bozma.

## ⚠️ Çakışma: `lib/palette.ts` (ÖNEMLİ)
Güncelleme `lib/palette.ts` EKLİYOR ama içeriği reypo'dakinden TAMAMEN farklı:
- **reypo'daki** `palette` = 3D marka renkleri (hex string obje); hero bileşenleri kullanıyor. **DOKUNMA.**
- **reypobackend'in** `palette` = proje/kişi için deterministik Tailwind renk dizisi (`PaletteEntry[]`).
  Kullananlar: `app/(app)/admin/people/page.tsx`, `app/(app)/projects/page.tsx`,
  `app/(app)/tasks/[id]/page.tsx`, `components/app-nav.tsx`.

**Çözüm:** task paletini `lib/entity-palette.ts` olarak ayrı dosyaya koy (içerik =
`git -C reypobackend show d04fcc1:lib/palette.ts`). Bu 4 kullananın import'unu
`@/lib/palette` → `@/lib/entity-palette` yap. reypo'nun marka `lib/palette.ts`'i olduğu gibi kalır.
(Bu yüzden patch'teki `lib/palette.ts` bloğunu doğrudan uygulamayacağız.)

## Dosya sınıflandırması (22 dosya)

### GÜVENLİ-KOPYA (reypo == v2.1, uyarlama yok → güncel HEAD sürümünü kopyala)
- `app/(app)/admin/people/page.tsx` → `app/app/admin/people/page.tsx`  *(palette import'unu düzelt)*
- `app/(app)/page.tsx` → `app/app/page.tsx`
- `app/(app)/settings/page.tsx` → `app/app/settings/page.tsx`
- `components/login-form.tsx`
- `components/tasks/task-approval-actions.tsx`
- `components/tasks/task-status-actions.tsx`
- `lib/hooks/use-unread-notifications.ts`
- `lib/task-labels.ts`

### YENİ dosya (kopyala)
- `components/tasks/task-quick-actions.tsx` (rangerover'da eklendi)

### MERGE (reypo uyarlanmış → 3-yönlü merge: base=v2.1, ours=reypo, theirs=HEAD)
- `app/(app)/admin/page.tsx` → `app/app/admin/page.tsx`
- `app/(app)/calendar/page.tsx` → `app/app/calendar/page.tsx`
- `app/(app)/layout.tsx` → `app/app/layout.tsx`
- `app/(app)/projects/page.tsx` → `app/app/projects/page.tsx`  *(palette import'unu düzelt)*
- `app/(app)/tasks/[id]/page.tsx` → `app/app/tasks/[id]/page.tsx`  *(palette import'unu düzelt)*
- `app/globals.css`  *(marketing+app paylaşımlı — tema kısmını elle gözden geçir)*
- `components/admin/pending-approvals.tsx`
- `components/app-nav.tsx`  *(palette import'unu düzelt + /app linkleri)*
- `components/task-calendar.tsx`
- `components/task-card.tsx`
- `lib/actions/notifications.ts`  *(revalidatePath /app önekleri)*
- `lib/actions/tasks.ts`  *(revalidatePath /app önekleri)*

## Yöntem (reypobackend erişilebilirse)
Her MERGE dosyası için 3-yönlü merge:
```
git -C ../reypobackend show 30bf632:<backend-yol> > /tmp/base   # v2.1
git -C ../reypobackend show d04fcc1:<backend-yol> > /tmp/theirs # HEAD
# ours = reypo'daki mevcut dosya
git merge-file -p <ours> /tmp/base /tmp/theirs > merged   # çakışma varsa <<<< işaretleri
```
Not: iki repo da CRLF. `git merge-file` satır bazlı — temiz sonuç için üçünü de
LF'e normalize edip (sed 's/\r$//') merge et, sonra CRLF'e geri çevir (sed 's/$/\r/').

## Doğrulama
1. `lib/entity-palette.ts` oluşturuldu, 4 kullanan güncellendi.
2. Ported task dosyalarında `/app` URL taraması:
   `grep -rnE 'href="/(projects|tasks|calendar|admin|notifications|settings)|redirect\("/"\)|revalidatePath\("/' app/app components lib/actions`
   — kök seviye task URL'i kalmasın (hepsi `/app/...`).
3. `npm run build` (bu repo Next 16 modifiye — AGENTS.md: önce `node_modules/next/dist/docs/` oku).
4. Route map: `/` marketing, `/app/*` dinamik, `/login`+`/set-password` çalışıyor mu.

## Notlar
- Marketing tarafı (hero, three.js, siteConfig, i18n vb.) bu port'tan ETKİLENMEZ.
- `lib/actions/{auth,guard,profile,projects,roles,users}.ts` ve
  `components/{admin-calendar,notification-row,project-task-row,...}` reypo'da farklı
  görünse de bu FARK sadece merge uyarlaması (v2.1→HEAD değişmemiş) — onlara DOKUNMA.
