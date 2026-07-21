import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { TaskCalendar, type CalDay, type CalTask } from "@/components/task-calendar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export default async function MyCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  // Bu takvim çalışan görünümüdür (kendine atanan görevler); yönetici
  // kendine görev alamadığı için burası ona hep boş görünür — Atama
  // Takvimi'ne yönlendirilir (2026-07-14 ürün kararı).
  if (profile?.system_role === "admin") {
    redirect("/app/admin/calendar");
  }

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
  const weekday = firstOfMonth.getUTCDay();
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

  // Bana atanmış satırlar (kişi bazlı alt-durum); takvimde kendi durumumu gösteririm.
  const { data: myRows } = await supabase
    .from("task_assignees")
    .select("task_id, status")
    .eq("user_id", user.id);
  const myStatusByTask = new Map((myRows ?? []).map((r) => [r.task_id, r.status]));
  const myTaskIds = [...myStatusByTask.keys()];

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    myTaskIds.length
      ? supabase
          .from("tasks")
          .select("id, title, priority, project_id, start_date")
          .in("id", myTaskIds)
          .not("start_date", "is", null)
          .gte("start_date", gridDates[0].date)
          .lte("start_date", gridDates[41].date)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("projects").select("id, name"),
  ]);

  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const tasksByDate = new Map<string, CalTask[]>();
  for (const t of tasks ?? []) {
    if (!t.start_date) continue;
    const list = tasksByDate.get(t.start_date) ?? [];
    list.push({
      id: t.id,
      title: t.title,
      status: myStatusByTask.get(t.id) ?? "todo",
      priority: t.priority,
      subtitle: projectNameById.get(t.project_id) ?? "",
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
    <TaskCalendar
      title="Takvim"
      subtitle="Görevlerin başlangıç günlerine göre planı."
      basePath="/app/calendar"
      monthLabel={monthLabel}
      currentMonth={currentMonth}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      thisMonth={thisMonth}
      days={days}
    />
  );
}
