import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./lib/supabase/types";

// Next.js 16'da middleware.ts kaldırıldı, yerine proxy.ts geldi (bkz. PLAN.md #3).
// Bu dosya SADECE oturum token'ını yeniler; sayfa/rol bazlı yetkilendirme
// app/(app)/layout.tsx ve Server Action'larda yapılır.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Token süresi dolmuşsa yenilemek için mutlaka çağrılmalı; sonucu kullanmasak
  // bile bu çağrı olmadan oturumlar sessizce sona erer.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  // Yalnızca oturum gerektiren alanlarda çalışır: /app/* (uygulama) + giriş akışı.
  // Public tanıtım sayfası (/) Supabase'e hiç dokunmaz → hızlı ve bağımsız kalır.
  matcher: ["/app", "/app/:path*", "/login", "/set-password"],
};
