-- Göreve planlanan başlangıç günü (start_date). Görev atanır atanmaz görünür kalır;
-- start_date yalnızca planlama etiketi + yönetici takvimi içindir (PLAN.md güncellemesi).

alter table public.tasks add column start_date date;
create index tasks_start_date_idx on public.tasks (start_date);

-- Üye kolon kilidi güncellenir: üye yalnızca status/completed_at değiştirebilir;
-- start_date de admin dışı değişikliklere kapatılır (mevcut protect_task_columns'a eklenir).
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
