import Link from "next/link";
import {
  priorityAccentClass,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
} from "@/lib/task-labels";
import { formatDate, isOverdue } from "@/lib/format";
import { TaskQuickActions } from "@/components/tasks/task-quick-actions";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

export function TaskCard({
  task,
  meta,
  revisionNote,
  quickActions = false,
}: {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    start_date?: string | null;
  };
  // Bağlama göre çağıran belirler: proje detayında atanan kişi adı,
  // "Görevlerim"de proje adı gösterilir.
  meta?: string;
  // Revize istenen görevde yöneticinin son notu; detaya girmeden görünsün.
  revisionNote?: string;
  // Karttan detaya girmeden durum ilerletme butonları (yalnızca atananın
  // kendi listesinde açılır; yönetici görünümlerinde kapalı kalır).
  quickActions?: boolean;
}) {
  return (
    <li
      className={`rounded-xl border border-l-4 border-border bg-card shadow-xs transition-all hover:border-ring/40 hover:shadow-sm ${priorityAccentClass[task.priority]}`}
    >
      <Link href={`/app/tasks/${task.id}`} className="block p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-medium">{task.title}</span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass[task.status]}`}
          >
            {statusLabel[task.status]}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {meta && <span className="truncate">{meta}</span>}
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${priorityBadgeClass[task.priority]}`}
          >
            {priorityLabel[task.priority]}
          </span>
          {isOverdue(task.due_date, task.status) && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
              Gecikti
            </span>
          )}
          {task.start_date && (
            <span>Başlangıç: {formatDate(task.start_date)}</span>
          )}
          {task.due_date && (
            <span>Son tarih: {formatDate(task.due_date)}</span>
          )}
        </div>
        {revisionNote && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <span className="font-medium">Revize notu:</span> {revisionNote}
          </p>
        )}
      </Link>
      {quickActions && (
        <TaskQuickActions taskId={task.id} status={task.status} />
      )}
    </li>
  );
}
