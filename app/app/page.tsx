import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { TaskCard } from "@/components/task-card";
import { priorityOrder, statusDotClass } from "@/lib/task-labels";
import type { TaskStatus } from "@/lib/supabase/types";

const groups: { status: TaskStatus; label: string }[] = [
  { status: "revision", label: "Revize İstendi" },
  { status: "todo", label: "Bekleyen" },
  { status: "in_progress", label: "Devam Eden" },
  { status: "awaiting_approval", label: "Onay Bekliyor" },
  { status: "done", label: "Tamamlanan" },
];

export default async function TasksPage() {
  const { supabase, user } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, start_date, project_id")
    .eq("assignee_id", user.id);

  const { data: projects } = await supabase.from("projects").select("id, name");
  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const sorted = [...(tasks ?? [])].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  // Revize istenen görevlerde yöneticinin son notu kartta görünsün
  // (çalışan detaya girmeden ne istendiğini görür).
  const revisionIds = sorted
    .filter((t) => t.status === "revision")
    .map((t) => t.id);
  const lastRevisionNote = new Map<string, string>();
  if (revisionIds.length > 0) {
    const { data: revNotes } = await supabase
      .from("task_revisions")
      .select("task_id, note, created_at")
      .in("task_id", revisionIds)
      .eq("kind", "revision_requested")
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

      {sorted.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Şu anda size atanmış bir görev yok.
        </p>
      )}

      {groups.map((group) => {
        const groupTasks = sorted.filter((task) => task.status === group.status);
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
