-- Onay + revize akışı — PLAN.md kararı #11.1 tersine çevrildi: artık onay akışı VAR.
--
-- Yeni yaşam döngüsü:
--   todo -> in_progress -> (çalışan: Tamamladım) -> awaiting_approval
--     awaiting_approval -> (yönetici: Onayla)      -> done
--     awaiting_approval -> (yönetici: Revize İste)  -> revision -> (çalışan: tekrar gönder) -> awaiting_approval
-- Onay/revize turlarının notları public.task_revisions tablosunda birikir.

-- 1) Yeni görev durumları.
--    NOT: ADD VALUE ile eklenen enum değerleri bu migration'ın SQL'inde
--    KULLANILMAZ; Postgres yeni bir enum değerinin eklendiği transaction içinde
--    kullanılmasına izin vermez. (Server Action katmanı bu değerleri kullanır.)
alter type task_status add value if not exists 'awaiting_approval';
alter type task_status add value if not exists 'revision';

-- 2) Yeni bildirim türleri (çalışan onaya gönderdi / yönetici onayladı / revize istedi).
alter type notification_type add value if not exists 'task_submitted';
alter type notification_type add value if not exists 'task_approved';
alter type notification_type add value if not exists 'task_revision_requested';

-- 3) Revize/onay geçmişi.
--    kind: submitted          = çalışan "Tamamladım" dedi (onaya gönderdi)
--          revision_requested = yönetici geri gönderdi (not zorunlu)
--          approved           = yönetici onayladı
create type revision_kind as enum ('submitted', 'revision_requested', 'approved');

create table public.task_revisions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  -- Yazar silinirse geçmiş satırı kalır ama author_id NULL'a düşer.
  author_id uuid references public.profiles(id) on delete set null,
  kind revision_kind not null,
  note text,
  created_at timestamptz not null default now()
);
create index task_revisions_task_idx on public.task_revisions (task_id, created_at);

alter table public.task_revisions enable row level security;

-- Geçmiş de görevin kendisi gibi gizli: yalnızca görevin atanan kişisi veya admin.
create policy task_revisions_select_own_or_admin on public.task_revisions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and t.assignee_id = auth.uid()
    )
  );

-- Insert: herkes yalnızca kendi adına (author_id = auth.uid()); admin her göreve,
-- üye yalnızca kendine atanmış göreve satır ekleyebilir. Satırlar append-only
-- (update/delete politikası yok = RLS varsayılan reddi; geçmiş değişmez).
create policy task_revisions_insert_author on public.task_revisions
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.assignee_id = auth.uid()
      )
    )
  );
