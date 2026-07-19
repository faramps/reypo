import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Her admin Server Action'ının ilk satırı bunu çağırmalı (bkz. PLAN.md #10
// Güvenlik Kontrol Listesi) — UI'da admin linkinin gizli olması yeterli değil.
//
// Oturum/rol geçersizse throw yerine redirect kullanılır: aynı tarayıcıda
// birden fazla hesapla test ederken (çerezler sekmeler arasında paylaşıldığı
// için) sayfa eski bir oturumla açık kalabilir — bu durumda kullanıcıya çirkin
// bir hata ekranı yerine düzgün bir yönlendirme gösterilir.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (profile?.system_role !== "admin") {
    redirect("/app");
  }

  return { supabase, user };
}
