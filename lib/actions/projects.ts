"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./guard";

export type ProjectState = { error?: string; success?: boolean } | undefined;

export async function createProject(
  _prevState: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const { supabase, user } = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) {
    return { error: "Proje adı gerekli." };
  }

  const { error } = await supabase
    .from("projects")
    .insert({ name, description, created_by: user.id });

  if (error) {
    return { error: "Proje oluşturulamadı." };
  }

  // Sidebar'daki proje listesi layout seviyesinde çekiliyor; sadece /projects
  // revalidate edilirse diğer sayfalarda sidebar bayat kalır.
  revalidatePath("/app", "layout");
  return undefined;
}

export async function updateProject(
  _prevState: ProjectState,
  formData: FormData
): Promise<ProjectState> {
  const { supabase } = await requireAdmin();

  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!projectId || !name) {
    return { error: "Proje adı gerekli." };
  }

  const { error } = await supabase
    .from("projects")
    .update({ name, description })
    .eq("id", projectId);

  if (error) {
    return { error: "Proje güncellenemedi." };
  }

  revalidatePath("/app", "layout");
  return { success: true };
}

export async function setProjectArchived(projectId: string, archived: boolean) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("projects")
    .update({ is_archived: archived })
    .eq("id", projectId);
  revalidatePath("/app", "layout");
}

export async function deleteProject(projectId: string) {
  const { supabase } = await requireAdmin();
  // Projeye bağlı görevler ve onların bildirimleri FK cascade ile silinir.
  await supabase.from("projects").delete().eq("id", projectId);
  revalidatePath("/app", "layout");
  redirect("/app/projects");
}
