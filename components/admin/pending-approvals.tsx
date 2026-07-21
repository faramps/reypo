"use client";

import Link from "next/link";
import { TaskApprovalActions } from "@/components/tasks/task-approval-actions";
import { statusBadgeClass, statusLabel } from "@/lib/task-labels";
import type { TaskStatus } from "@/lib/supabase/types";

export type PendingItem = {
  id: string;
  title: string;
  projectName: string;
  assignees: { userId: string; name: string; status: TaskStatus }[];
};

// Onay bekleyen görevleri tek listede toplar; her satırda görevin detayına
// girmeden Onayla / kişi bazlı Revize yapılır (TaskApprovalActions yeniden kullanılır).
export function PendingApprovals({ items }: { items: PendingItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <Link href={`/app/tasks/${item.id}`} className="min-w-0">
              <span className="block truncate font-medium hover:underline">
                {item.title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.assignees.map((a) => a.name).join(", ") || "—"} ·{" "}
                {item.projectName}
              </span>
            </Link>
            {item.assignees.length > 1 && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass.awaiting_approval}`}
              >
                {statusLabel.awaiting_approval}
              </span>
            )}
          </div>
          <TaskApprovalActions taskId={item.id} assignees={item.assignees} />
        </li>
      ))}
    </ul>
  );
}
