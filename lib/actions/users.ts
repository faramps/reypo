"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SystemRole } from "@/lib/supabase/types";

export type CreateUserState =
  | { error?: string; createdEmail?: string; password?: string }
  | undefined;

// Okunması/iletilmesi kolay geçici şifre: gt-XXXXXX (6 base36 karakter).
// Kullanıcı ilk girişte Ayarlar > Güvenlik'ten değiştirir.
function generateTempPassword() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `gt-${rand}`;
}

// E-postasız model (ürün kararı 2026-07-09): admin hesabı doğrudan oluşturur;
// davet maili gönderilmez. Üretilen geçici şifre admin'e bir kez gösterilir.
export async function createUser(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleId = String(formData.get("role_id") ?? "") || null;

  if (!email || !fullName) {
    return { error: "Ad Soyad ve e-posta zorunlu." };
  }

  const adminClient = createAdminClient();
  const password = generateTempPassword();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // e-posta doğrulaması yok; hesap direkt aktif
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    const already = error?.message?.toLowerCase().includes("already");
    return {
      error: already
        ? "Bu e-posta zaten kayıtlı."
        : "Kullanıcı oluşturulamadı.",
    };
  }

  // handle_new_user trigger'ı full_name'i metadata'dan alır; iş rolünü burada set ederiz.
  if (roleId) {
    await adminClient
      .from("profiles")
      .update({ role_id: roleId })
      .eq("id", data.user.id);
  }

  revalidatePath("/app/admin/users");
  return { createdEmail: email, password };
}

// Şifre sıfırlama (e-postasız): admin yeni geçici şifre üretir, kişiye iletir.
export async function resetUserPassword(
  userId: string
): Promise<{ error?: string; password?: string }> {
  await requireAdmin();

  const password = generateTempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return { error: "Şifre sıfırlanamadı." };
  }
  return { password };
}

export async function updateUserRole(userId: string, roleId: string | null) {
  const { supabase } = await requireAdmin();
  await supabase.from("profiles").update({ role_id: roleId }).eq("id", userId);
  revalidatePath("/app/admin/users");
}

export async function updateSystemRole(userId: string, systemRole: SystemRole) {
  const { supabase, user } = await requireAdmin();

  // Kilitlenme önlemi: yönetici kendi yetkisini düşüremez (tek yönetici
  // kendini üyeye çevirirse sistemde yönetici kalmaz).
  if (userId === user.id) {
    return;
  }

  await supabase
    .from("profiles")
    .update({ system_role: systemRole })
    .eq("id", userId);
  revalidatePath("/app/admin/users");
}

export async function deleteUser(
  userId: string
): Promise<{ error?: string } | undefined> {
  const { user } = await requireAdmin();

  if (userId === user.id) {
    return { error: "Kendi hesabınızı silemezsiniz." };
  }

  const adminClient = createAdminClient();

  // tasks.assignee_id -> profiles(id) "on delete" davranışı tanımlanmadığı için
  // (geçmiş görev kayıtları korunsun diye bilinçli), atanmış görevi olan bir
  // kullanıcı silinemez — burada erken ve anlaşılır bir hata veriyoruz.
  const { count } = await adminClient
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("assignee_id", userId);

  if (count && count > 0) {
    return {
      error: `Bu kullanıcıya atanmış ${count} görev var. Görev detay sayfasındaki "Düzenle" ile başka birine atayın veya "Sil" ile kaldırın, sonra tekrar deneyin.`,
    };
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return { error: "Kullanıcı silinemedi." };
  }

  revalidatePath("/app/admin/users");
  return undefined;
}
