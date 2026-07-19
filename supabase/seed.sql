-- Geliştirme ortamı için örnek iş rolleri (bkz. PLAN.md Faz 2)
insert into public.roles (name, color) values
  ('Yazılımcı', '#3b82f6'),
  ('Tasarımcı', '#a855f7'),
  ('Proje Yöneticisi', '#f59e0b')
on conflict (name) do nothing;
