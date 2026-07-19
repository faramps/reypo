"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationType } from "@/lib/supabase/types";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationRow({
  notification,
}: {
  notification: Notification;
}) {
  const [, startTransition] = useTransition();

  function handleClick() {
    if (!notification.is_read) {
      startTransition(() => markNotificationRead(notification.id));
    }
  }

  const content = (
    <div
      className={`rounded-xl border border-border p-4 shadow-xs transition-all hover:border-ring/40 ${
        notification.is_read ? "bg-card" : "border-primary/20 bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{notification.title}</span>
        {!notification.is_read && (
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-primary"
            aria-label="Okunmadı"
          />
        )}
      </div>
      {notification.body && (
        <p className="mt-1 break-words text-sm text-muted-foreground">
          {notification.body}
        </p>
      )}
    </div>
  );

  if (notification.task_id) {
    return (
      <li>
        <Link
          href={`/app/tasks/${notification.task_id}`}
          onClick={handleClick}
          className="block"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button type="button" onClick={handleClick} className="block w-full text-left">
        {content}
      </button>
    </li>
  );
}
