"use client";

import { useState, useTransition } from "react";
import { Check, Undo2 } from "lucide-react";
import { approveTask, requestRevision } from "@/lib/actions/tasks";

// Yalnızca yönetici + onay bekleyen görev için render edilir (görev detay sayfası).
// "Onayla" görevi doğrudan tamamlar; "Revize İste" önce not alanını açar,
// not yazılınca gönderilir (pending-approvals ile aynı iki aşamalı desen).
export function TaskApprovalActions({ taskId }: { taskId: string }) {
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const noteEmpty = note.trim().length === 0;

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

  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <p className="text-sm font-medium text-violet-900">
        Çalışan görevi tamamladı. Görevi bitirip kapatabilir veya revize
        isteyebilirsiniz.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => approveTask(taskId))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Görevi Bitir
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setRevising((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" />
          Revize İste
        </button>
      </div>

      {revising && (
        <div className="space-y-2">
          <textarea
            autoFocus
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Neyin düzeltilmesi gerektiğini yazın…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || noteEmpty}
              title={noteEmpty ? "Önce revize notu yazın" : undefined}
              onClick={() => run(() => requestRevision(taskId, note))}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Revize Gönder
            </button>
            <button
              type="button"
              onClick={() => {
                setRevising(false);
                setNote("");
              }}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
