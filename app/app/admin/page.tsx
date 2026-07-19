import Link from "next/link";
import {
  CalendarDays,
  ContactRound,
  FolderKanban,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewTaskPanel } from "@/components/admin/new-task-panel";
import {
  PendingApprovals,
  type PendingItem,
} from "@/components/admin/pending-approvals";

const shortcuts: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Atama Takvimi", href: "/app/admin/calendar", icon: CalendarDays },
  { label: "Kişi Görevleri", href: "/app/admin/people", icon: ContactRound },
  { label: "Projeler", href: "/app/projects", icon: FolderKanban },
  { label: "İş Rolleri", href: "/app/admin/roles", icon: Tags },
  { label: "Kullanıcılar", href: "/app/admin/users", icon: Users },
];

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [
    {
      data: { user },
    },
    { data: pendingTasks },
    { data: profiles },
    { data: roles },
    { data: projects },
    { data: authUsers },
    { count: userCount },
    { count: projectCount },
    { count: taskCount },
    { count: doneCount },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("tasks")
      .select("id, title, assignee_id, project_id, updated_at")
      .eq("status", "awaiting_approval")
      .order("updated_at", { ascending: true }),
    supabase.from("profiles").select("id, full_name, role_id"),
    supabase.from("roles").select("id, name").order("created_at"),
    supabase
      .from("projects")
      .select("id, name, is_archived")
      .order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers(),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "done"),
  ]);

  const emailById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameById.set(p.id, p.full_name || emailById.get(p.id) || "Kullanıcı");
  }
  const projectNameById = new Map((projects ?? []).map((p) => [p.id, p.name]));

  const pending: PendingItem[] = (pendingTasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    assigneeName: nameById.get(t.assignee_id) ?? "—",
    projectName: projectNameById.get(t.project_id) ?? "—",
  }));

  const assignees = (profiles ?? [])
    .filter((p) => p.id !== user?.id) // yönetici kendine görev atayamaz
    .map((p) => ({
      id: p.id,
      label: p.full_name || emailById.get(p.id) || "Kullanıcı",
      roleId: p.role_id,
    }));
  const activeProjects = (projects ?? [])
    .filter((p) => !p.is_archived)
    .map((p) => ({ id: p.id, name: p.name }));

  const stats = [
    { label: "Kullanıcı", value: userCount ?? 0 },
    { label: "Proje", value: projectCount ?? 0 },
    {
      label: "Görev",
      value: taskCount ?? 0,
      detail: `${doneCount ?? 0} tamamlandı`,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Yönetim</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Onay Bekleyenler{" "}
          <span className="text-muted-foreground/60">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Şu anda onay bekleyen görev yok.
          </p>
        ) : (
          <PendingApprovals items={pending} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Yeni Görev
        </h2>
        <NewTaskPanel
          projects={activeProjects}
          assignees={assignees}
          roles={roles ?? []}
        />
      </section>

      <section className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{stat.label}</p>
            {stat.detail && (
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.detail}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Kısayollar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-xs transition-all hover:border-ring/40 hover:shadow-sm"
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                {s.label}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
