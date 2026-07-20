import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { ProjectForm } from "@/components/projects/project-form";
import { colorFor } from "@/lib/entity-palette";

export default async function ProjectsPage() {
  const { supabase, profile } = await getCurrentProfile();
  const isAdmin = profile?.system_role === "admin";

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  // Arşiv yalnızca yönetime gösterilir (arşivden çıkarma oradan yapılır).
  const { data: archived } = isAdmin
    ? await supabase
        .from("projects")
        .select("id, name")
        .eq("is_archived", true)
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Projeler</h1>

      {isAdmin && <ProjectForm />}

      <ul className="space-y-2">
        {(projects ?? []).map((project) => (
          <li key={project.id}>
            <Link
              href={`/app/projects/${project.id}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-ring/40 hover:shadow-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorFor(project.id).dot}`}
                />
                <span className="break-words font-medium">{project.name}</span>
              </span>
              {project.description && (
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </Link>
          </li>
        ))}
        {(projects ?? []).length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Henüz proje yok.
          </li>
        )}
      </ul>

      {isAdmin && (archived ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Arşiv{" "}
            <span className="text-muted-foreground/60">
              ({archived!.length})
            </span>
          </h2>
          <ul className="space-y-2">
            {archived!.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/app/projects/${project.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 p-4 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <span className="break-words">{project.name}</span>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Arşivlenmiş
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
