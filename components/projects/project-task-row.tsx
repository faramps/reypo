import Link from "next/link";
import { priorityBadgeClass, priorityLabel } from "@/lib/task-labels";
import { formatDate, initials, isOverdue } from "@/lib/format";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

// Proje detayında "kim ne yapıyor" bir bakışta görünsün diye atanan kişi
// avatar + isimle öne çıkarılır; durum bilgisini grup başlığı taşır.
export function ProjectTaskRow({
  task,
  assigneeName,
}: {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
  };
  assigneeName: string;
}) {
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <li>
      <Link
        href={`/app/tasks/${task.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-xs transition-all hover:border-ring/40 hover:shadow-sm"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials(assigneeName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{task.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {assigneeName || "—"}
            {task.due_date &&
              !overdue &&
              ` · Son tarih: ${formatDate(task.due_date)}`}
          </span>
        </span>
        {overdue && (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Gecikti
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClass[task.priority]}`}
        >
          {priorityLabel[task.priority]}
        </span>
      </Link>
    </li>
  );
}
