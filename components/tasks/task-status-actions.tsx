"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { submitForApproval, reopenTask } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/supabase/types";

// Çalışan (atanan kişi) tarafı: durum ilerletme butonları.
// - "Tamamladım / Yeniden Gönder" kişinin KENDİ alt-durumuna (myStatus) göre çalışır.
// - "Yeniden Aç" görevin genel durumuna (taskStatus === 'done') göre, yalnızca yönetici.
// Onay bekleyen görev için yöneticinin onay/revize paneli ayrı bileşendedir
// (task-approval-actions.tsx).
export function TaskStatusActions({
  taskId,
  taskStatus,
  myStatus,
  isAdmin,
  isAssignee,
}: {
  taskId: string;
  taskStatus: TaskStatus;
  myStatus: TaskStatus | null;
  isAdmin: boolean;
  isAssignee: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Revize cevabı: çalışan yeniden gönderirken "şunu düzelttim" notu ekleyebilir.
  const [replyNote, setReplyNote] = useState("");

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

  // Tamamlanmış görev: yalnızca yönetici yeniden açabilir (görev geneli).
  if (taskStatus === "done") {
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

  // Buradan sonrası yalnızca göreve atanmış kişiye ait (kendi işini ilerletir).
  if (!isAssignee || !myStatus) {
    return null;
  }

  // Kişi kendi işini gönderdi: yönetici incelemesini bekliyor.
  if (myStatus === "awaiting_approval") {
    return (
      <p className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        İşinizi onaya gönderdiniz. Yönetici incelemesi bekleniyor.
      </p>
    );
  }

  // done (bireysel) ama görev henüz done değil: nadir; ilerletecek bir şey yok.
  if (myStatus === "done") {
    return null;
  }

  const primaryLabel = myStatus === "revision" ? "Yeniden Gönder" : "Tamamladım";

  return (
    <ActionWrapper error={error}>
      {myStatus === "revision" && (
        <div className="w-full space-y-2">
          <p className="text-sm text-rose-800">
            Revize istendi. Aşağıdaki geçmişteki notu uygulayıp yeniden gönderin.
          </p>
          <textarea
            rows={2}
            value={replyNote}
            onChange={(e) => setReplyNote(e.target.value)}
            placeholder="Cevabınız (isteğe bağlı): neyi değiştirdiniz?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          run(() =>
            submitForApproval(
              taskId,
              myStatus === "revision" ? replyNote : undefined
            )
          )
        }
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
