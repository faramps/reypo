import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// SUPABASE_SERVICE_ROLE_KEY RLS'i atlar. Bu dosya hiçbir client component'ten
// import edilmemeli — "server-only" paketi yanlışlıkla client bundle'a
// girerse build'i kırar. Kullanım alanları: kullanıcı daveti, push gönderimi.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
