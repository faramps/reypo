"use client";

import { useState, useTransition } from "react";
import { submitForApproval } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/supabase/types";

// Görev kartından detaya girmeden "Tamamladım" ("Görevlerim" listesi).
// Revize cevabı not gerektirebildiği için revision durumunda hızlı buton yok;
// kart, cevap kutusunun olduğu detay sayfasına götürür. in_progress yalnızca
// eski kayıtlar için tanınır ("Başladım" adımı kaldırıldı).
export function TaskQuickActions({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "todo" && status !== "in_progress") {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2">
      {error && <p className="mr-auto text-xs text-destructive">{error}</p>}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await submitForApproval(taskId);
            } catch {
              setError("İşlem tamamlanamadı, tekrar deneyin.");
            }
          });
        }}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Gönderiliyor…" : "Tamamladım"}
      </button>
    </div>
  );
}
