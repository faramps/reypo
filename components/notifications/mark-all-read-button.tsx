"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markAllNotificationsRead } from "@/lib/actions/notifications";

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => markAllNotificationsRead())}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
    >
      <CheckCheck className="h-4 w-4" />
      Tümünü okundu işaretle
    </button>
  );
}
