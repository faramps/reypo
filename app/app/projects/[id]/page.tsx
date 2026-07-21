import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectTaskRow } from "@/components/projects/project-task-row";
import type { TaskStatus } from "@/lib/supabase/types";

const statusGroups: { status: TaskStatus; label: string }[] = [
  { status: "awaiting_approval", label: "Onay Bekliyor" },
  { status: "revision", label: "Revize İstendi" },
  { status: "in_progress", label: "Devam Eden" },
  { status: "todo", label: "Bekleyen" },
  { status: "done", label: "Tamamlanan" },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await getCurrentProfile();
  const isAdmin = profile?.system_role === "admin";

  const [{ data: project }, { data: tasks }, { data: allProfiles }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, description, is_archived")
        .eq("id", id)
        .single(),
      // RLS burada da geçerli: member sadece kendi görevlerini görür.
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, role_id"),
    ]);

  if (!project) {
    notFound();
  }

  // Görevlerin atananları (satırda isim(ler) gösterilir).
  const projectTaskIds = (tasks ?? []).map((t) => t.id);
  const { data: projectAssignees } = projectTaskIds.length
    ? await supabase
        .from("task_assignees")
        .select("task_id, user_id")
        .in("task_id", projectTaskIds)
    : { data: [] as { task_id: string; user_id: string }[] };
  const assigneeIdsByTask = new Map<string, string[]>();
  for (const a of projectAssignees ?? []) {
    const list = assigneeIdsByTask.get(a.task_id) ?? [];
    list.push(a.user_id);
    assigneeIdsByTask.set(a.task_id, list);
  }

  const nameById = new Map(
    (allProfiles ?? []).map((p) => [p.id, p.full_name])
  );

  // E-posta yedeği HERKES için: isimsiz eş-atananlar üyeye de "—" yerine
  // tanımlı görünsün (küçük ofis modeli: herkes birbirini görebilir).
  const { data: authUsers } = await createAdminClient().auth.admin.listUsers();
  const emailById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
  for (const p of allProfiles ?? []) {
    if (!p.full_name) {
      nameById.set(p.id, emailById.get(p.id) ?? "");
    }
  }

  let roles: { id: string; name: string }[] = [];
  let assignees: { id: string; label: string; roleId: string | null }[] = [];

  if (isAdmin) {
    const { data: roleRows } = await supabase
      .from("roles")
      .select("id, name")
      .order("created_at");
    roles = roleRows ?? [];
    assignees = (allProfiles ?? [])
      .filter((p) => p.id !== user?.id) // yönetici kendine görev atayamaz
      .map((p) => ({
        id: p.id,
        label: p.full_name || emailById.get(p.id) || "Kullanıcı",
        roleId: p.role_id,
      }));
  }

  const taskList = tasks ?? [];

  return (
    <div className="space-y-6">
      <ProjectHeader
        name={project.name}
        description={project.description}
        isArchived={project.is_archived}
        isAdmin={isAdmin}
        projectId={project.id}
        roles={roles}
        assignees={assignees}
      />

      {taskList.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Bu projede henüz görev yok.
        </p>
      ) : (
        statusGroups.map((group) => {
          const groupTasks = taskList.filter(
            (task) => task.status === group.status
          );
          if (groupTasks.length === 0) {
            return null;
          }
          return (
            <section key={group.status} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {group.label}{" "}
                <span className="text-muted-foreground/60">
                  ({groupTasks.length})
                </span>
              </h2>
              <ul className="space-y-2">
                {groupTasks.map((task) => (
                  <ProjectTaskRow
                    key={task.id}
                    task={task}
                    assigneeNames={(assigneeIdsByTask.get(task.id) ?? []).map(
                      (uid) => nameById.get(uid) ?? ""
                    )}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
