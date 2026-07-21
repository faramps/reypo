"use client";

import { useState, useTransition } from "react";
import { Check, Undo2 } from "lucide-react";
import { approveTask, requestRevisions } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/supabase/types";

type Assignee = { userId: string; name: string; status: TaskStatus };

// Yalnızca yönetici + onay bekleyen görev için render edilir (görev detayı).
// Bu noktada TÜM atananlar işini göndermiştir. Yönetici ya hepsini onaylar,
// ya da kişi bazlı revize verir: her kişi için ayrı not veya "hepsine aynı not".
// Not verilmeyen kişi kabul edilmiş sayılır (kısmi onay).
export function TaskApprovalActions({
  taskId,
  assignees,
}: {
  taskId: string;
  assignees: Assignee[];
}) {
  const [revising, setRevising] = useState(false);
  const [common, setCommon] = useState(assignees.length <= 1);
  const [commonNote, setCommonNote] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
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

  function submitRevisions() {
    const entries = common
      ? assignees.map((a) => ({ userId: a.userId, note: commonNote }))
      : assignees.map((a) => ({ userId: a.userId, note: notes[a.userId] ?? "" }));
    const valid = entries.filter((e) => e.note.trim().length > 0);
    if (valid.length === 0) {
      setError("En az bir kişiye revize notu yazın.");
      return;
    }
    run(() => requestRevisions(taskId, valid));
  }

  const multi = assignees.length > 1;

  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <p className="text-sm font-medium text-violet-900">
        {multi
          ? "Tüm atananlar işini tamamladı. Görevi bitirebilir veya kişi bazlı revize isteyebilirsiniz."
          : "Çalışan görevi tamamladı. Görevi bitirip kapatabilir veya revize isteyebilirsiniz."}
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
        <div className="space-y-3">
          {multi && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={common}
                onChange={(e) => setCommon(e.target.checked)}
                className="h-4 w-4"
              />
              Hepsine aynı notu gönder
            </label>
          )}

          {common ? (
            <textarea
              autoFocus
              rows={3}
              value={commonNote}
              onChange={(e) => setCommonNote(e.target.value)}
              placeholder={
                multi
                  ? "Tüm atananlara gidecek revize notu…"
                  : "Neyin düzeltilmesi gerektiğini yazın…"
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Not yazdığınız kişilere revize gider; boş bırakılanların işi
                kabul edilir.
              </p>
              {assignees.map((a) => (
                <div key={a.userId} className="space-y-1">
                  <label className="block truncate text-sm font-medium">
                    {a.name}
                  </label>
                  <textarea
                    rows={2}
                    value={notes[a.userId] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [a.userId]: e.target.value,
                      }))
                    }
                    placeholder="Revize notu (boş = kabul)…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={submitRevisions}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Revize Gönder
            </button>
            <button
              type="button"
              onClick={() => {
                setRevising(false);
                setCommonNote("");
                setNotes({});
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
