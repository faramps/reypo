"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import {
  startTask,
  submitForApproval,
  reopenTask,
} from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/supabase/types";

// Çalışan (atanan kişi) tarafı: durumu ilerletme butonları.
// Onay bekleyen görev için yöneticinin onay/revize paneli ayrı bileşendedir
// (task-approval-actions.tsx).
export function TaskStatusActions({
  taskId,
  status,
  isAdmin,
  isAssignee,
}: {
  taskId: string;
  status: TaskStatus;
  isAdmin: boolean;
  isAssignee: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setError("İşlem tamamlanamadı, tekrar deneyin.");
      }
    });
  }

  // Tamamlanmış görev: yalnızca yönetici yeniden açabilir.
  if (status === "done") {
    if (!isAdmin) {
      return null;
    }
    return (
      <ActionWrapper error={error}>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => reopenTask(taskId))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Yeniden Aç
        </button>
      </ActionWrapper>
    );
  }

  // Onay bekliyor: çalışana bilgi notu (yönetici paneli ayrı render edilir).
  if (status === "awaiting_approval") {
    if (isAssignee && !isAdmin) {
      return (
        <p className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          Görev onay için gönderildi. Yönetici incelemesi bekleniyor.
        </p>
      );
    }
    return null;
  }

  const primaryLabel = status === "revision" ? "Yeniden Gönder" : "Tamamladım";

  return (
    <ActionWrapper error={error}>
      {status === "revision" && (
        <p className="w-full text-sm text-rose-800">
          Revize istendi. Aşağıdaki geçmişteki notu uygulayıp yeniden gönderin.
        </p>
      )}
      {(status === "todo" || status === "revision") && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => startTask(taskId))}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          Başladım
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => submitForApproval(taskId))}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {primaryLabel}
      </button>
    </ActionWrapper>
  );
}

function ActionWrapper({
  error,
  children,
}: {
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
