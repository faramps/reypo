import Link from "next/link";
import {
  CalendarDays,
  ContactRound,
  FolderKanban,
  ListChecks,
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

// Her kısayolun kendi rengi: ikonlar tek tip gri yerine yumuşak renkli
// çiplerde, hangi kısayolun ne olduğu bir bakışta ayrışır.
const shortcuts: {
  label: string;
  href: string;
  icon: LucideIcon;
  chip: string;
}[] = [
  {
    label: "Atama Takvimi",
    href: "/app/admin/calendar",
    icon: CalendarDays,
    chip: "bg-sky-100 text-sky-700",
  },
  {
    label: "Kişi Görevleri",
    href: "/app/admin/people",
    icon: ContactRound,
    chip: "bg-violet-100 text-violet-700",
  },
  {
    label: "Projeler",
    href: "/app/projects",
    icon: FolderKanban,
    chip: "bg-amber-100 text-amber-800",
  },
  {
    label: "İş Rolleri",
    href: "/app/admin/roles",
    icon: Tags,
    chip: "bg-rose-100 text-rose-700",
  },
  {
    label: "Kullanıcılar",
    href: "/app/admin/users",
    icon: Users,
    chip: "bg-indigo-100 text-indigo-700",
  },
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

  const stats: {
    label: string;
    value: number;
    icon: LucideIcon;
    chip: string;
    href: string;
    detail?: string;
  }[] = [
    {
      label: "Kullanıcı",
      value: userCount ?? 0,
      icon: Users,
      chip: "bg-indigo-100 text-indigo-700",
      href: "/app/admin/users",
    },
    {
      label: "Proje",
      value: projectCount ?? 0,
      icon: FolderKanban,
      chip: "bg-sky-100 text-sky-700",
      href: "/app/projects",
    },
    {
      label: "Görev",
      value: taskCount ?? 0,
      icon: ListChecks,
      chip: "bg-emerald-100 text-emerald-700",
      href: "/app/admin/people",
      detail: `${doneCount ?? 0} tamamlandı`,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Yönetim</h1>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span aria-hidden className="h-2 w-2 rounded-full bg-violet-500" />
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="block rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-ring/40 hover:shadow-sm"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg ${stat.chip}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {stat.label}
              </p>
              {stat.detail && (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  {stat.detail}
                </p>
              )}
            </Link>
          );
        })}
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
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${s.chip}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {s.label}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
