"use client";

import { useState, useTransition } from "react";
import { Check, Undo2 } from "lucide-react";
import { approveTask, requestRevision } from "@/lib/actions/tasks";

// Yalnızca yönetici + onay bekleyen görev için render edilir (görev detay sayfası).
// "Onayla" görevi tamamlar; "Revize İste" notla birlikte geri gönderir (not zorunlu).
export function TaskApprovalActions({ taskId }: { taskId: string }) {
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
        Bu görev onayınızı bekliyor.
      </p>

      <div className="space-y-1">
        <label htmlFor="revision_note" className="text-sm font-medium">
          Revize notu{" "}
          <span className="font-normal text-muted-foreground">
            (revize isteğinde zorunlu)
          </span>
        </label>
        <textarea
          id="revision_note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Neyin düzeltilmesi gerektiğini yazın…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => approveTask(taskId, note))}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Onayla
        </button>
        <button
          type="button"
          disabled={isPending || noteEmpty}
          title={noteEmpty ? "Önce revize notu yazın" : undefined}
          onClick={() => run(() => requestRevision(taskId, note))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" />
          Revize İste
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
