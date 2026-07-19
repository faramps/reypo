import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { NotificationRow } from "@/components/notifications/notification-row";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

const NOTIFICATION_LIMIT = 50;

export default async function NotificationsPage() {
  const { supabase, user } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, task_id, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_LIMIT);

  const list = notifications ?? [];
  const hasUnread = list.some((n) => !n.is_read);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Bildirimler</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>
      <ul className="space-y-2">
        {list.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Henüz bildirim yok.
          </li>
        )}
      </ul>
      {list.length === NOTIFICATION_LIMIT && (
        <p className="text-center text-xs text-muted-foreground">
          Son {NOTIFICATION_LIMIT} bildirim gösteriliyor.
        </p>
      )}
    </div>
  );
}
