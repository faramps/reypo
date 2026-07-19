import { createClient } from "./server";

// (app)/layout.tsx, admin/layout.tsx ve projects sayfaları hepsi "oturumdaki
// kullanıcı + profili" ihtiyacı duyar; tekrarı önlemek için tek yerden.
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, system_role, role_id")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}
