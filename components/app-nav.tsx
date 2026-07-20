"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ContactRound,
  FolderKanban,
  Hash,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useUnreadNotifications } from "@/lib/hooks/use-unread-notifications";
import { logout } from "@/lib/actions/auth";
import { colorFor } from "@/lib/entity-palette";
import { initials } from "@/lib/format";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

const SIDEBAR_PROJECT_LIMIT = 8;

export function AppNav({
  userId,
  initialUnreadIds,
  isAdmin,
  userLabel,
  projects,
}: {
  userId: string;
  initialUnreadIds: string[];
  isAdmin: boolean;
  userLabel: string;
  projects: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const unreadCount = useUnreadNotifications(userId, initialUnreadIds);

  // Takvim çalışan görünümüdür (kendine atanan görevler); yönetici Atama
  // Takvimi'ni kullandığı için menüsünde gösterilmez.
  const mainItems: NavItem[] = [
    { href: "/app", label: "Görevlerim", icon: ListChecks },
    ...(isAdmin
      ? []
      : [{ href: "/app/calendar", label: "Takvim", icon: CalendarDays } satisfies NavItem]),
    { href: "/app/notifications", label: "Bildirimler", icon: Bell, badge: unreadCount },
    { href: "/app/settings", label: "Ayarlar", icon: Settings },
  ];

  // Sidebar'da yalnızca en sık kullanılan yönetim girişleri; Roller/Kullanıcılar
  // gibi ayarlar Yönetim panelindeki (/admin) kısayollardan açılır.
  const adminItems: NavItem[] = [
    { href: "/app/admin", label: "Yönetim Paneli", icon: LayoutDashboard },
    { href: "/app/admin/calendar", label: "Atama Takvimi", icon: CalendarDays },
    { href: "/app/admin/people", label: "Kişi Görevleri", icon: ContactRound },
  ];

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    if (href === "/app/admin") return pathname === "/app/admin";
    return pathname.startsWith(href);
  }

  function itemClass(active: boolean) {
    return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
    }`;
  }

  function renderSidebarItem(item: NavItem) {
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} className={itemClass(isActive(item.href))}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {!!item.badge && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </Link>
    );
  }

  // Mobil alt bar: sidebar bölümleri yerine kompakt sekmeler
  // Mobil alt bar en fazla 5 sekme. Admin'de "Projeler" yerini "Yönetim" alır
  // (projelere Yönetim panelindeki kısayoldan ulaşılır); üye "Projeler"i görür.
  const mobileItems: NavItem[] = [
    { href: "/app", label: "Görevlerim", icon: ListChecks },
    ...(isAdmin
      ? []
      : [
          {
            href: "/app/calendar",
            label: "Takvim",
            icon: CalendarDays,
          } satisfies NavItem,
          {
            href: "/app/projects",
            label: "Projeler",
            icon: FolderKanban,
          } satisfies NavItem,
        ]),
    { href: "/app/notifications", label: "Bildirimler", icon: Bell, badge: unreadCount },
    { href: "/app/settings", label: "Ayarlar", icon: Settings },
    ...(isAdmin
      ? [{ href: "/app/admin", label: "Yönetim", icon: ShieldCheck } satisfies NavItem]
      : []),
  ];

  const visibleProjects = projects.slice(0, SIDEBAR_PROJECT_LIMIT);

  return (
    <>
      {/* Masaüstü: sabit sol sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            G
          </span>
          <span className="truncate text-sm font-semibold">Görev Takip</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {mainItems.map(renderSidebarItem)}

          <div className="flex items-center justify-between px-3 pb-1 pt-5">
            <Link
              href="/app/projects"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              Projeler
            </Link>
            {isAdmin && (
              <Link
                href="/app/projects"
                aria-label="Yeni proje oluştur"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          {visibleProjects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}`}
              className={itemClass(pathname === `/app/projects/${project.id}`)}
            >
              <Hash className={`h-4 w-4 shrink-0 ${colorFor(project.id).icon}`} />
              <span className="truncate">{project.name}</span>
            </Link>
          ))}
          {projects.length > SIDEBAR_PROJECT_LIMIT && (
            <Link
              href="/app/projects"
              className="block px-3 py-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Tümünü gör ({projects.length})
            </Link>
          )}
          {projects.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-muted-foreground">
              Henüz proje yok
            </p>
          )}

          {isAdmin && (
            <>
              <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Yönetim
              </p>
              {adminItems.map(renderSidebarItem)}
            </>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 px-3 pb-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${colorFor(userId).chip}`}
            >
              {initials(userLabel)}
            </span>
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              {userLabel}
              {isAdmin ? " · Yönetici" : ""}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </form>
        </div>
      </aside>

      {/* Mobil: iPhone'da alt sabit sekme çubuğu, safe-area-bottom'a duyarlı */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? "font-medium text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              {!!item.badge && (
                <span className="absolute right-1/2 top-1 flex h-3.5 min-w-3.5 translate-x-3 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
