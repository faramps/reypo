-- Ofis Görev Takip Sistemi — ilk şema
-- Bkz. PLAN.md bölüm 4 (Veritabanı Şeması) ve bölüm 11 (Kesinleşen Kararlar)

create extension if not exists pgcrypto;

-- =========================================================
-- ENUM'lar
-- =========================================================
create type system_role as enum ('admin', 'member');
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'normal', 'high', 'urgent');
create type notification_type as enum ('task_assigned', 'task_completed', 'task_updated');

-- =========================================================
-- Tablolar
-- roles ve profiles birbirine referans verdiği için (roles.created_by -> profiles,
-- profiles.role_id -> roles) roles.created_by FK'si tablo oluştuktan sonra eklenir.
-- =========================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  system_role system_role not null default 'member',
  role_id uuid references public.roles(id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.roles
  add constraint roles_created_by_fkey foreign key (created_by) references public.profiles(id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'normal',
  assignee_id uuid not null references public.profiles(id),
  role_id uuid references public.roles(id) on delete set null,
  due_date date,
  created_by uuid not null references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assignee_status_idx on public.tasks (assignee_id, status);
create index tasks_project_idx on public.tasks (project_id);

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
create index notifications_user_unread_idx on public.notifications (user_id, is_read);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- auth.users -> profiles otomatik satır (trigger, security definer ile RLS'i atlar)
-- =========================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- tasks.updated_at otomatik güncelleme
-- =========================================================
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- =========================================================
-- Yardımcı fonksiyon: admin kontrolü (security definer -> RLS recursion'ı önler)
-- =========================================================
create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.profiles where id = auth.uid() and system_role = 'admin'
  );
$$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: herkes görebilir; kendi satırını veya admin herkesi güncelleyebilir
-- (full_name/avatar_url dışındaki alan değişikliklerini engellemek Server Action katmanının işi)
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);

create policy profiles_update_own_or_admin on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete to authenticated using (public.is_admin());

-- roles: herkes görebilir, sadece admin yazabilir
create policy roles_select_authenticated on public.roles
  for select to authenticated using (true);

create policy roles_insert_admin on public.roles
  for insert to authenticated with check (public.is_admin());

create policy roles_update_admin on public.roles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy roles_delete_admin on public.roles
  for delete to authenticated using (public.is_admin());

-- projects: herkes görebilir (küçük ofis modeli), sadece admin yazabilir
create policy projects_select_authenticated on public.projects
  for select to authenticated using (true);

create policy projects_insert_admin on public.projects
  for insert to authenticated with check (public.is_admin());

create policy projects_update_admin on public.projects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy projects_delete_admin on public.projects
  for delete to authenticated using (public.is_admin());

-- tasks: admin hepsini görür/yazar; member sadece kendine atanan görevi görür/günceller
-- (member'ın yalnızca status/completed_at değiştirebilmesi Server Action katmanında zorlanır)
create policy tasks_select_own_or_admin on public.tasks
  for select to authenticated using (assignee_id = auth.uid() or public.is_admin());

create policy tasks_insert_admin on public.tasks
  for insert to authenticated with check (public.is_admin());

create policy tasks_update_own_or_admin on public.tasks
  for update to authenticated
  using (assignee_id = auth.uid() or public.is_admin())
  with check (assignee_id = auth.uid() or public.is_admin());

create policy tasks_delete_admin on public.tasks
  for delete to authenticated using (public.is_admin());

-- notifications: yalnızca kendi bildirimlerin; insert service role'e ayrılmış (policy yok = anon/authenticated insert edemez)
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- push_subscriptions: yalnızca kendi cihaz aboneliklerin
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- Realtime: bildirim zili için notifications tablosunu yayına ekle
-- =========================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
