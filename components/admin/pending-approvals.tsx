"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2 } from "lucide-react";
import { approveTask, requestRevision } from "@/lib/actions/tasks";

export type PendingItem = {
  id: string;
  title: string;
  assigneeName: string;
  projectName: string;
};

// Onay bekleyen görevleri tek listede toplar; her satırda görevin detayına
// girmeden Onayla / Revize İste yapılır.
export function PendingApprovals({ items }: { items: PendingItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <PendingApprovalRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function PendingApprovalRow({ item }: { item: PendingItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch {
        setError("İşlem tamamlanamadı, tekrar deneyin.");
      }
    });
  }

  return (
    <li className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/app/tasks/${item.id}`} className="min-w-0">
          <span className="block truncate font-medium hover:underline">
            {item.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {item.assigneeName} · {item.projectName}
          </span>
        </Link>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => approveTask(item.id))}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Onayla
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setRevising((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            Revize
          </button>
        </div>
      </div>

      {revising && (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Neyin düzeltilmesi gerektiğini yazın…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || note.trim().length === 0}
              onClick={() => run(() => requestRevision(item.id, note))}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Revize İste
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

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </li>
  );
}
