import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { logout } from "@/lib/actions/auth";
import { AppNav } from "@/components/app-nav";

// /app ve alt sayfaları: AÇIK tema + iOS PWA meta'ları (ürün kararı 2026-07-09).
export const metadata: Metadata = {
  title: "Görev Takip",
  appleWebApp: {
    capable: true,
    title: "Görev Takip",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Klavye açıldığında içerik alanı yeniden boyutlanır (alt sabit sekme çubuğu).
  interactiveWidget: "resizes-content",
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  const [{ data: unread }, { data: projects }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_read", false),
    supabase
      .from("projects")
      .select("id, name")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
  ]);

  const isAdmin = profile?.system_role === "admin";
  const userLabel = profile?.full_name || user.email || "";

  return (
    <div className="flex min-h-full flex-1">
      <AppNav
        userId={user.id}
        initialUnreadIds={(unread ?? []).map((n) => n.id)}
        isAdmin={isAdmin}
        userLabel={userLabel}
        projects={projects ?? []}
      />

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        {/* Mobil üst bar; masaüstünde sidebar bu bilgileri taşıdığı için gizli */}
        <header className="flex items-center justify-between border-b border-border bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              G
            </span>
            <span className="text-sm font-semibold">Görev Takip</span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-muted-foreground underline underline-offset-2"
            >
              Çıkış
            </button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
