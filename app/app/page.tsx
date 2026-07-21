import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { TaskCard } from "@/components/task-card";
import { priorityOrder, statusDotClass } from "@/lib/task-labels";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

const groups: { status: TaskStatus; label: string }[] = [
  { status: "revision", label: "Revize İstendi" },
  { status: "todo", label: "Bekleyen" },
  { status: "in_progress", label: "Devam Eden" },
  { status: "awaiting_approval", label: "Onay Bekliyor" },
  { status: "done", label: "Tamamlanan" },
];

// Bir kişi "işini tamamladı" sayılır: onaya gönderdi veya onaylandı.
function isCompletedForProgress(status: TaskStatus) {
  return status === "awaiting_approval" || status === "done";
}

export default async function TasksPage() {
  const { supabase, user } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  // Bana atanmış satırlar (kişi bazlı alt-durum burada).
  const { data: myRows } = await supabase
    .from("task_assignees")
    .select("task_id, status")
    .eq("user_id", user.id);

  const myStatusByTask = new Map<string, TaskStatus>(
    (myRows ?? []).map((r) => [r.task_id, r.status])
  );
  const taskIds = [...myStatusByTask.keys()];

  const [{ data: tasks }, { data: allAssignees }, { data: projects }] =
    await Promise.all([
      taskIds.length
        ? supabase
            .from("tasks")
            .select("id, title, priority, due_date, start_date, project_id")
            .in("id", taskIds)
        : Promise.resolve({ data: [] as never[] }),
      taskIds.length
        ? supabase
            .from("task_assignees")
            .select("task_id, status")
            .in("task_id", taskIds)
        : Promise.resolve({ data: [] as never[] }),
      supabase.from("projects").select("id, name"),
    ]);

  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));

  // Çok kişili görevde "X/N tamamladı" ilerlemesi.
  const progressByTask = new Map<string, { done: number; total: number }>();
  for (const a of allAssignees ?? []) {
    const cur = progressByTask.get(a.task_id) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (isCompletedForProgress(a.status)) cur.done += 1;
    progressByTask.set(a.task_id, cur);
  }

  // Kart için her göreve KENDİ alt-durumumu ekle; önceliğe göre sırala.
  const cards = (tasks ?? [])
    .map((t) => ({
      ...t,
      status: myStatusByTask.get(t.id) ?? ("todo" as TaskStatus),
    }))
    .sort(
      (a, b) =>
        priorityOrder[a.priority as TaskPriority] -
        priorityOrder[b.priority as TaskPriority]
    );

  // Bana istenen revizelerde yöneticinin son notu kartta görünsün.
  const revisionIds = cards
    .filter((t) => t.status === "revision")
    .map((t) => t.id);
  const lastRevisionNote = new Map<string, string>();
  if (revisionIds.length > 0) {
    const { data: revNotes } = await supabase
      .from("task_revisions")
      .select("task_id, note, created_at")
      .in("task_id", revisionIds)
      .eq("kind", "revision_requested")
      .eq("target_user_id", user.id)
      .order("created_at", { ascending: false });
    for (const r of revNotes ?? []) {
      if (r.note && !lastRevisionNote.has(r.task_id)) {
        lastRevisionNote.set(r.task_id, r.note);
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Görevlerim</h1>

      {cards.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Şu anda size atanmış bir görev yok.
        </p>
      )}

      {groups.map((group) => {
        const groupTasks = cards.filter((task) => task.status === group.status);
        if (groupTasks.length === 0) {
          return null;
        }
        return (
          <section key={group.status} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${statusDotClass[group.status]}`}
              />
              {group.label}
              <span className="text-muted-foreground/60">
                ({groupTasks.length})
              </span>
            </h2>
            <ul className="space-y-2">
              {groupTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  meta={projectNameById.get(task.project_id) ?? ""}
                  revisionNote={lastRevisionNote.get(task.id)}
                  progress={progressByTask.get(task.id)}
                  quickActions
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
