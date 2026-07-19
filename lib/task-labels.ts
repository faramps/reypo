import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

// task-card.tsx, "Görevlerim" ve görev detay sayfası aynı etiketleri kullanır.
export const statusLabel: Record<TaskStatus, string> = {
  todo: "Bekliyor",
  in_progress: "Devam Ediyor",
  awaiting_approval: "Onay Bekliyor",
  revision: "Revize İstendi",
  done: "Tamamlandı",
};

export const priorityLabel: Record<TaskPriority, string> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

export const priorityOrder: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Aydınlık tema rozet renkleri (uygulama yalnızca aydınlık tema kullanır)
export const statusBadgeClass: Record<TaskStatus, string> = {
  todo: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  awaiting_approval: "bg-violet-100 text-violet-800",
  revision: "bg-rose-100 text-rose-800",
  done: "bg-emerald-100 text-emerald-800",
};

export const priorityBadgeClass: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-700",
};
