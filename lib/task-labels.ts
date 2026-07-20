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

// Bölüm başlıklarındaki renk noktaları; rozetlerle aynı renk ailesi
export const statusDotClass: Record<TaskStatus, string> = {
  todo: "bg-amber-500",
  in_progress: "bg-blue-500",
  awaiting_approval: "bg-violet-500",
  revision: "bg-rose-500",
  done: "bg-emerald-500",
};

export const priorityBadgeClass: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-secondary text-secondary-foreground",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-700",
};

// Görev kartının sol kenar şeridi: rozeti okumadan önceliği sezdirir.
// hover: kopyaları, karttaki hover:border-ring/40'ın şeridi ezmemesi için.
export const priorityAccentClass: Record<TaskPriority, string> = {
  low: "border-l-slate-300 hover:border-l-slate-300",
  normal: "border-l-indigo-300 hover:border-l-indigo-300",
  high: "border-l-orange-400 hover:border-l-orange-400",
  urgent: "border-l-red-500 hover:border-l-red-500",
};
