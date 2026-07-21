create table public.task_assignees (
id uuid primary key default gen_random_uuid(),
task_id uuid not null references public.tasks(id) on delete cascade,
user_id uuid not null references public.profiles(id),
status public.task_status not null default 'todo',
completed_at timestamptz,
created_at timestamptz not null default now(),
unique (task_id, user_id)
);

create index task_assignees_user_status_idx on public.task_assignees (user_id, status);
create index task_assignees_task_idx on public.task_assignees (task_id);

insert into public.task_assignees (task_id, user_id, status, completed_at)
select id, assignee_id, status, completed_at from public.tasks;

alter table public.task_revisions
add column target_user_id uuid references public.profiles(id) on delete set null;

create index task_revisions_target_idx on public.task_revisions (task_id, target_user_id);

create function public.is_task_assignee(p_task uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
select exists(
select 1 from public.task_assignees
where task_id = p_task and user_id = auth.uid()
);
$$;

create function public.recompute_task_status(p_task uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
n int;
done_count int;
rev_count int;
await_count int;
new_status public.task_status;
begin
select count(*),
count(*) filter (where status = 'done'),
count(*) filter (where status = 'revision'),
count(*) filter (where status = 'awaiting_approval')
into n, done_count, rev_count, await_count
from public.task_assignees
where task_id = p_task;

if n = 0 then
return;
end if;

if done_count = n then
new_status := 'done';
elsif rev_count > 0 then
new_status := 'revision';
elsif await_count = n then
new_status := 'awaiting_approval';
elsif (await_count + done_count) > 0 then
new_status := 'in_progress';
else
new_status := 'todo';
end if;

update public.tasks
set status = new_status,
completed_at = case when new_status = 'done' then coalesce(completed_at, now()) else null end
where id = p_task;
end;
$$;

create function public.task_assignees_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
if tg_op = 'DELETE' then
perform public.recompute_task_status(old.task_id);
return old;
end if;
perform public.recompute_task_status(new.task_id);
return new;
end;
$$;

create trigger task_assignees_rollup_trigger
after insert or update or delete on public.task_assignees
for each row execute function public.task_assignees_rollup();

create or replace function public.protect_task_assignee_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
if auth.uid() is not null and not public.is_admin() then
if new.user_id is distinct from old.user_id
or new.task_id is distinct from old.task_id
or old.user_id is distinct from auth.uid() then
raise exception 'Uyeler yalnizca kendi gorev durumunu guncelleyebilir';
end if;
end if;
return new;
end;
$$;

create trigger task_assignees_protect_columns
before update on public.task_assignees
for each row execute function public.protect_task_assignee_columns();

alter table public.task_assignees enable row level security;

create policy task_assignees_select_own_or_admin on public.task_assignees
for select to authenticated
using (public.is_admin() or public.is_task_assignee(task_id));

create policy task_assignees_insert_admin on public.task_assignees
for insert to authenticated with check (public.is_admin());

create policy task_assignees_update_own_or_admin on public.task_assignees
for update to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy task_assignees_delete_admin on public.task_assignees
for delete to authenticated using (public.is_admin());

drop policy tasks_select_own_or_admin on public.tasks;
drop policy tasks_update_own_or_admin on public.tasks;

create policy tasks_select_own_or_admin on public.tasks
for select to authenticated
using (public.is_task_assignee(id) or public.is_admin());

create policy tasks_update_own_or_admin on public.tasks
for update to authenticated
using (public.is_task_assignee(id) or public.is_admin())
with check (public.is_task_assignee(id) or public.is_admin());

drop policy task_revisions_select_own_or_admin on public.task_revisions;
drop policy task_revisions_insert_author on public.task_revisions;

create policy task_revisions_select_own_or_admin on public.task_revisions
for select to authenticated
using (public.is_admin() or public.is_task_assignee(task_id));

create policy task_revisions_insert_author on public.task_revisions
for insert to authenticated
with check (author_id = auth.uid() and (public.is_admin() or public.is_task_assignee(task_id)));

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
or new.start_date is distinct from old.start_date
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

drop index if exists public.tasks_assignee_status_idx;
alter table public.tasks drop column assignee_id;
