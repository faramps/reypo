import { formatDateTime } from "@/lib/format";
import type { RevisionKind } from "@/lib/supabase/types";

const kindLabel: Record<RevisionKind, string> = {
  submitted: "onaya gönderdi",
  revision_requested: "revize istedi",
  approved: "onayladı",
};

const kindDotClass: Record<RevisionKind, string> = {
  submitted: "bg-violet-500",
  revision_requested: "bg-rose-500",
  approved: "bg-emerald-500",
};

export type RevisionItem = {
  id: string;
  kind: RevisionKind;
  note: string | null;
  created_at: string;
  authorName: string;
};

// Görev detayında onay/revize turlarının geçmişi (append-only, eskiden yeniye).
export function TaskRevisionHistory({
  revisions,
}: {
  revisions: RevisionItem[];
}) {
  if (revisions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <h2 className="text-sm font-semibold">Onay / Revize Geçmişi</h2>
      <ol className="mt-4 space-y-4">
        {revisions.map((rev) => (
          <li key={rev.id} className="flex gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${kindDotClass[rev.kind]}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{rev.authorName || "—"}</span>{" "}
                <span className="text-muted-foreground">
                  {kindLabel[rev.kind]}
                </span>
              </p>
              {rev.note && (
                <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-muted px-3 py-2 text-sm">
                  {rev.note}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(rev.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
