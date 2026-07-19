-- 1) Kullanıcı silme çıkmazı düzeltmesi:
--    created_by kolonları bilgi amaçlıdır; kullanıcı silinince NULL'a düşer.
--    (assignee_id bilinçli olarak RESTRICT kalır — atanmış görevi olan kullanıcı
--    silinmeden önce görevleri devredilmeli/silinmeli; artık UI'da mümkün.)

alter table public.tasks alter column created_by drop not null;
alter table public.tasks drop constraint tasks_created_by_fkey;
alter table public.tasks add constraint tasks_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.projects alter column created_by drop not null;
alter table public.projects drop constraint projects_created_by_fkey;
alter table public.projects add constraint projects_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.roles drop constraint roles_created_by_fkey;
alter table public.roles add constraint roles_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- 2) KRİTİK güvenlik: RLS satır bazlı çalışır, kolon bazlı kısıt koyamaz.
--    profiles_update_own_or_admin politikası üyenin kendi satırını
--    güncellemesine izin verdiği için, üye REST API üzerinden kendi
--    system_role'ünü 'admin' yapabilirdi (yetki yükseltme). Trigger ile
--    kolon değişiklikleri kilitlenir.
--    auth.uid() IS NULL kontrolü: service_role ve SQL editörü (JWT'siz)
--    bakım işlemleri için bypass bırakır; anon/authenticated istekleri
--    her zaman auth.uid() taşır.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.system_role is distinct from old.system_role
       or new.role_id is distinct from old.role_id then
      raise exception 'Yetki alanlarini yalnizca yonetici degistirebilir';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 3) Aynı sınıf açığın hafif hali: üye kendi görevinin yalnızca
--    status/completed_at alanlarını değiştirebilmeli (PLAN.md kararı);
--    RLS bunu kolon bazında zorlayamadığı için trigger ile kilitlenir.

create or replace function public.protect_task_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.priority is distinct from old.priority
       or new.due_date is distinct from old.due_date
       or new.assignee_id is distinct from old.assignee_id
       or new.role_id is distinct from old.role_id
       or new.project_id is distinct from old.project_id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Uyeler yalnizca gorev durumunu guncelleyebilir';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_protect_columns
  before update on public.tasks
  for each row execute function public.protect_task_columns();
