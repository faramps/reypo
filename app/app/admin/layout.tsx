import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  // (app)/layout.tsx zaten oturumu doğruladı; burada sadece yönetici yetkisi kontrol edilir.
  if (profile?.system_role !== "admin") {
    redirect("/app");
  }

  return (
    <div className="space-y-6">
      {/* Masaüstünde sidebar'daki Yönetim bölümü bu linkleri taşır; alt-nav sadece mobil */}
      <nav className="flex gap-2 md:hidden">
        <Link
          href="/app/admin"
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm"
        >
          Özet
        </Link>
        <Link
          href="/app/admin/calendar"
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm"
        >
          Atama Takvimi
        </Link>
        <Link
          href="/app/admin/people"
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm"
        >
          Kişiler
        </Link>
        <Link
          href="/app/admin/roles"
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm"
        >
          Roller
        </Link>
        <Link
          href="/app/admin/users"
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm"
        >
          Kullanıcılar
        </Link>
      </nav>
      {children}
    </div>
  );
}
