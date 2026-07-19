import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminCalendar,
  type CalDay,
  type CalTask,
} from "@/components/admin/admin-calendar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
// UTC tabanlı "YYYY-MM-DD" (gün kayması olmadan takvim hücresi eşleştirmek için).
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const { month: monthParam } = await searchParams;

  const now = new Date();
  let year: number;
  let monthIdx: number;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    monthIdx = m - 1;
  } else {
    year = now.getFullYear();
    monthIdx = now.getMonth();
  }

  const firstOfMonth = new Date(Date.UTC(year, monthIdx, 1));
  const weekday = firstOfMonth.getUTCDay(); // 0 Paz .. 6 Cmt
  const leading = (weekday + 6) % 7; // Pazartesi başlangıç
  const gridStart = new Date(Date.UTC(year, monthIdx, 1 - leading));
  const todayStr = ymd(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  );

  const gridDates = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getTime() + i * 86400000);
    return {
      date: ymd(d),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === monthIdx,
      isToday: ymd(d) === todayStr,
    };
  });
  const gridStartStr = gridDates[0].date;
  const gridEndStr = gridDates[41].date;

  const [
    { data: tasks },
    { data: profiles },
    { data: roles },
    { data: projects },
    { data: authUsers },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, assignee_id, start_date")
      .not("start_date", "is", null)
      .gte("start_date", gridStartStr)
      .lte("start_date", gridEndStr),
    supabase.from("profiles").select("id, full_name, role_id"),
    supabase.from("roles").select("id, name").order("created_at"),
    supabase
      .from("projects")
      .select("id, name")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    createAdminClient().auth.admin.listUsers(),
    supabase.auth.getUser(),
  ]);

  const emailById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameById.set(p.id, p.full_name || emailById.get(p.id) || "Kullanıcı");
  }

  const assignees = (profiles ?? [])
    .filter((p) => p.id !== user?.id) // yönetici kendine görev atayamaz
    .map((p) => ({
      id: p.id,
      label: p.full_name || emailById.get(p.id) || "Kullanıcı",
      roleId: p.role_id,
    }));

  const tasksByDate = new Map<string, CalTask[]>();
  for (const t of tasks ?? []) {
    if (!t.start_date) continue;
    const list = tasksByDate.get(t.start_date) ?? [];
    list.push({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      subtitle: nameById.get(t.assignee_id) ?? "—",
    });
    tasksByDate.set(t.start_date, list);
  }

  const days: CalDay[] = gridDates.map((d) => ({
    ...d,
    tasks: tasksByDate.get(d.date) ?? [],
  }));

  const monthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(firstOfMonth);
  const prevMonth = ymd(new Date(Date.UTC(year, monthIdx - 1, 1))).slice(0, 7);
  const nextMonth = ymd(new Date(Date.UTC(year, monthIdx + 1, 1))).slice(0, 7);
  const currentMonth = ymd(new Date(Date.UTC(year, monthIdx, 1))).slice(0, 7);
  const thisMonth = ymd(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  ).slice(0, 7);

  return (
    <AdminCalendar
      monthLabel={monthLabel}
      currentMonth={currentMonth}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      thisMonth={thisMonth}
      days={days}
      projects={projects ?? []}
      assignees={assignees}
      roles={roles ?? []}
    />
  );
}
