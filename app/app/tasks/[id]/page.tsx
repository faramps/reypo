import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { TaskStatusActions } from "@/components/tasks/task-status-actions";
import { TaskApprovalActions } from "@/components/tasks/task-approval-actions";
import { TaskAdminActions } from "@/components/tasks/task-admin-actions";
import {
  TaskRevisionHistory,
  type RevisionItem,
} from "@/components/tasks/task-revision-history";
import {
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
} from "@/lib/task-labels";
import { formatDate, formatDateTime, initials, isOverdue } from "@/lib/format";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  // RLS (tasks_select_own_or_admin) başkasının görevini zaten görünmez kılar;
  // bu durumda task null döner ve 404 gösteririz (izin hatası sızdırmaz).
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_date, start_date, project_id, assignee_id, role_id, created_by, created_at, completed_at"
    )
    .eq("id", id)
    .single();

  if (!task) {
    notFound();
  }

  const [{ data: project }, { data: role }, { data: revisionRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name")
        .eq("id", task.project_id)
        .single(),
      task.role_id
        ? supabase
            .from("roles")
            .select("name, color")
            .eq("id", task.role_id)
            .single()
        : Promise.resolve({ data: null }),
      // Revize/onay geçmişi (RLS: assignee veya admin görür).
      supabase
        .from("task_revisions")
        .select("id, kind, note, author_id, created_at")
        .eq("task_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const isAdmin = profile?.system_role === "admin";
  const isAssignee = task.assignee_id === user.id;

  // İsim çözümlemesi için gereken tüm kişi id'leri: atanan, oluşturan, revize yazarları.
  const personIds = Array.from(
    new Set(
      [
        task.assignee_id,
        task.created_by,
        ...(revisionRows ?? []).map((r) => r.author_id),
      ].filter((v): v is string => !!v)
    )
  );

  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", personIds);

  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  // Düzenleme paneli için (yalnızca admin): rol listesi + atanabilir kişiler + e-postalar.
  let editRoles: { id: string; name: string }[] = [];
  let editAssignees: { id: string; label: string }[] = [];
  if (isAdmin) {
    const [{ data: roleRows }, { data: profileRows }, { data: authUsers }] =
      await Promise.all([
        supabase.from("roles").select("id, name").order("created_at"),
        supabase.from("profiles").select("id, full_name"),
        createAdminClient().auth.admin.listUsers(),
      ]);
    const emailById = new Map(
      (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
    );
    // İsimsiz profilleri e-postaya düşür (hem geçmiş hem detay görünümü için).
    for (const pid of personIds) {
      if (!nameById.get(pid)) {
        nameById.set(pid, emailById.get(pid) ?? "");
      }
    }
    editRoles = roleRows ?? [];
    editAssignees = (profileRows ?? [])
      .filter((p) => p.id !== user.id) // yönetici kendine görev atayamaz
      .map((p) => ({
        id: p.id,
        label: p.full_name || emailById.get(p.id) || "Kullanıcı",
      }));
  }

  function personLabel(personId: string | null) {
    if (!personId) return "—";
    const name = nameById.get(personId);
    if (name) return name;
    if (personId === user!.id) return user!.email ?? "—";
    return "—";
  }

  const assigneeName = personLabel(task.assignee_id);
  const creatorName = task.created_by ? personLabel(task.created_by) : null;
  const overdue = isOverdue(task.due_date, task.status);
  const canUpdateStatus = isAdmin || isAssignee;

  const revisions: RevisionItem[] = (revisionRows ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    note: r.note,
    created_at: r.created_at,
    authorName: personLabel(r.author_id),
  }));

  return (
    <div className="space-y-4">
      {project && (
        <Link
          href={`/app/projects/${project.id}`}
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          ← {project.name}
        </Link>
      )}

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 break-words text-lg font-semibold">
            {task.title}
          </h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass[task.status]}`}
          >
            {statusLabel[task.status]}
          </span>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
          {task.description || "Görev tanımı eklenmemiş."}
        </p>

        <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Atanan</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                {initials(assigneeName === "—" ? "" : assigneeName)}
              </span>
              <span className="truncate">{assigneeName}</span>
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">Öncelik</dt>
            <dd className="mt-1">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClass[task.priority]}`}
              >
                {priorityLabel[task.priority]}
              </span>
            </dd>
          </div>

          {role && (
            <div>
              <dt className="text-xs text-muted-foreground">İş Rolü</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: role.color ?? "#999" }}
                />
                {role.name}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-xs text-muted-foreground">Başlangıç</dt>
            <dd className="mt-1">
              {task.start_date ? formatDate(task.start_date) : "Belirtilmemiş"}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">Son Tarih</dt>
            <dd className="mt-1 flex items-center gap-2">
              {task.due_date ? formatDate(task.due_date) : "Belirtilmemiş"}
              {overdue && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Gecikti
                </span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-muted-foreground">Oluşturulma</dt>
            <dd className="mt-1">
              {formatDateTime(task.created_at)}
              {creatorName && (
                <span className="text-muted-foreground"> · {creatorName}</span>
              )}
            </dd>
          </div>

          {task.completed_at && (
            <div>
              <dt className="text-xs text-muted-foreground">Tamamlanma</dt>
              <dd className="mt-1">{formatDateTime(task.completed_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      {canUpdateStatus && (
        <TaskStatusActions
          taskId={task.id}
          status={task.status}
          isAdmin={isAdmin}
          isAssignee={isAssignee}
        />
      )}

      {isAdmin && task.status === "awaiting_approval" && (
        <TaskApprovalActions taskId={task.id} />
      )}

      <TaskRevisionHistory revisions={revisions} />

      {isAdmin && (
        <TaskAdminActions
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            due_date: task.due_date,
            start_date: task.start_date,
            assignee_id: task.assignee_id,
            role_id: task.role_id,
          }}
          roles={editRoles}
          assignees={editAssignees}
        />
      )}
    </div>
  );
}
