# Kurulum Adımları (Supabase proje bilgisi geldiğinde)

Bu proje şu anda kod tarafı tamamlanmış ama gerçek bir Supabase projesine
bağlanmamış durumda (bkz. PLAN.md Faz 0/1). Proje oluşturulunca sırayla:

## 1. Ortam değişkenlerini doldur

`.env.local` dosyasında şu üç değeri Supabase Dashboard → Project Settings →
API sayfasından alıp doldur:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

VAPID anahtarları zaten üretilmiş durumda, dokunmaya gerek yok.

## 2. Migration'ı uygula

```bash
npx supabase login          # tarayıcı açılır
npx supabase link --project-ref <project-ref>   # ref, proje URL'sinde: <ref>.supabase.co
npx supabase db push        # supabase/migrations/*.sql dosyalarını uygular
```

`supabase/seed.sql` örnek iş rollerini (Yazılımcı, Tasarımcı, Proje Yöneticisi)
ekler; `db push` bunu otomatik çalıştırmaz — istersen SQL Editor'den elle çalıştır.

## 3. İlk admin kullanıcısını oluştur

Kayıt ekranı yok (davet modeli), o yüzden ilk kullanıcı elle açılır:

1. Dashboard → Authentication → Users → **Add user** → e-posta + şifre gir
   (veya **Invite user** ile e-posta gönder).
2. `handle_new_user` trigger'ı otomatik olarak `public.profiles` satırı açar
   (`system_role = 'member'` varsayılanıyla).
3. SQL Editor'de bu kullanıcıyı admin yap:

```sql
update public.profiles
set system_role = 'admin'
where id = (select id from auth.users where email = 'ADMIN_EPOSTASI');
```

## 4. RLS doğrulama (Faz 1 kabul kriteri)

SQL Editor'de **anon key** ile (service role değil) çalıştır — başka bir
kullanıcının görevi görünmemeli:

```sql
-- authenticated rolüyle simüle etmek için Supabase'in "Run as" / JWT ayarını kullan
-- veya iki farklı tarayıcıda iki hesapla giriş yapıp karşılıklı test et.
select * from public.tasks;  -- member iken sadece kendi görevleri dönmeli
```

## 5. Uygulamayı test et

```bash
npm run dev
```

`/login` üzerinden admin hesabıyla giriş yap → `/` (Görevlerim) boş dashboard'u
görmelisin → oturumsuz istek `/login`'e düşmeli.
