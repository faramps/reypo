import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskCard } from "@/components/task-card";
import {
  priorityOrder,
  statusBadgeClass,
  statusLabel,
} from "@/lib/task-labels";
import { initials } from "@/lib/format";
import { colorFor } from "@/lib/entity-palette";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

// Kişi kartında görevleri "aksiyon isteyen"den sona doğru sırala.
const statusOrder: Record<TaskStatus, number> = {
  awaiting_approval: 0,
  revision: 1,
  in_progress: 2,
  todo: 3,
  done: 4,
};

// Çip olarak gösterilecek durum sırası (0 olanlar gizlenir).
const chipStatuses: TaskStatus[] = [
  "awaiting_approval",
  "revision",
  "in_progress",
  "todo",
  "done",
];

export default async function AdminPeoplePage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [
    { data: authUsers },
    { data: profiles },
    { data: roles },
    { data: taskRows },
    { data: assigneeRows },
    { data: projects },
  ] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    supabase.from("profiles").select("id, full_name, role_id"),
    supabase.from("roles").select("id, name, color"),
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, project_id"),
    supabase.from("task_assignees").select("task_id, user_id, status"),
    supabase.from("projects").select("id, name"),
  ]);

  // Kart, kişinin KENDİ alt-durumunu (task_assignees.status) gösterir.
  type TaskRow = {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    project_id: string;
  };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const roleById = new Map((roles ?? []).map((r) => [r.id, r]));
  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const taskById = new Map((taskRows ?? []).map((t) => [t.id, t]));

  // Görevleri atanan kişiye göre grupla (bir kişi birden çok görevde olabilir);
  // durum kişinin kendi atama satırından gelir.
  const tasksByAssignee = new Map<string, TaskRow[]>();
  for (const a of assigneeRows ?? []) {
    const t = taskById.get(a.task_id);
    if (!t) continue;
    const list = tasksByAssignee.get(a.user_id) ?? [];
    list.push({
      id: t.id,
      title: t.title,
      status: a.status,
      priority: t.priority,
      due_date: t.due_date,
      project_id: t.project_id,
    });
    tasksByAssignee.set(a.user_id, list);
  }

  const people = (authUsers?.users ?? []).map((u) => {
    const profile = profileById.get(u.id);
    const name = profile?.full_name || u.email || "Kullanıcı";
    const role = profile?.role_id ? roleById.get(profile.role_id) : null;
    const personTasks = (tasksByAssignee.get(u.id) ?? [])
      .slice()
      .sort(
        (a, b) =>
          statusOrder[a.status] - statusOrder[b.status] ||
          priorityOrder[a.priority] - priorityOrder[b.priority]
      );

    const counts = personTasks.reduce(
      (acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }),
      {} as Partial<Record<TaskStatus, number>>
    );

    return {
      id: u.id,
      name,
      email: u.email ?? "",
      role,
      tasks: personTasks,
      counts,
      awaiting: counts.awaiting_approval ?? 0,
    };
  });

  // En çok aksiyon bekleyen (onay bekleyen) üstte; sonra görev sayısı, sonra isim.
  people.sort(
    (a, b) =>
      b.awaiting - a.awaiting ||
      b.tasks.length - a.tasks.length ||
      a.name.localeCompare(b.name, "tr")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Kişi Görevleri</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Her kişinin görevleri; onay bekleyenler en üstte.
        </p>
      </div>

      {people.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Henüz kullanıcı yok.
        </p>
      )}

      <div className="space-y-4">
        {people.map((person) => (
          <section
            key={person.id}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${colorFor(person.id).chip}`}
              >
                {initials(person.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{person.name}</span>
                  {person.role && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: person.role.color ?? "#999" }}
                      />
                      {person.role.name}
                    </span>
                  )}
                </p>
                {person.email && person.email !== person.name && (
                  <p className="truncate text-xs text-muted-foreground">
                    {person.email}
                  </p>
                )}
              </div>
            </div>

            {person.tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Atanmış görev yok.
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chipStatuses.map((status) => {
                    const count = person.counts[status] ?? 0;
                    if (count === 0) return null;
                    return (
                      <span
                        key={status}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[status]}`}
                      >
                        {statusLabel[status]} {count}
                      </span>
                    );
                  })}
                </div>

                <ul className="mt-3 space-y-2">
                  {person.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      meta={projectNameById.get(task.project_id) ?? ""}
                    />
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
