"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./guard";

export type RoleState = { error?: string } | undefined;

export async function createRole(
  _prevState: RoleState,
  formData: FormData
): Promise<RoleState> {
  const { supabase, user } = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;

  if (!name) {
    return { error: "Rol adı gerekli." };
  }

  const { error } = await supabase
    .from("roles")
    .insert({ name, color, created_by: user.id });

  if (error) {
    if (error.code === "23505") {
      return { error: "Bu isimde bir rol zaten var." };
    }
    return { error: "Rol eklenemedi." };
  }

  revalidatePath("/app/admin/roles");
  return undefined;
}

export async function deleteRole(id: string) {
  const { supabase } = await requireAdmin();
  // roles.id'ye referans veren profiles.role_id ve tasks.role_id "on delete set null"
  // olduğu için silme, kullanan kayıtları engellemek yerine null'a düşürür (PLAN.md Faz 2).
  await supabase.from("roles").delete().eq("id", id);
  revalidatePath("/app/admin/roles");
  revalidatePath("/app/admin/users");
}
