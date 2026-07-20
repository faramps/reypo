"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS (notifications_update_own) zaten user_id = auth.uid() dışındaki satırları
// engeller; başka bir kullanıcının bildirimi için id gönderilse bile hiçbir satır
// güncellenmez.
export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  // "layout": rozet sayacı AppNav'da (tüm sayfaların layout'u) yaşadığı için
  // yalnızca /notifications değil tüm ağaç tazelenmeli.
  revalidatePath("/app", "layout");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/app", "layout");
}
