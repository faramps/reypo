import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { TaskCard } from "@/components/task-card";
import { priorityOrder } from "@/lib/task-labels";
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
            <h2 className="text-sm font-medium text-muted-foreground">
              {group.label}
            </h2>
            <ul className="space-y-2">
              {groupTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  meta={projectNameById.get(task.project_id) ?? ""}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
