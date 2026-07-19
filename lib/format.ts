import type { TaskStatus } from "@/lib/supabase/types";

// due_date "YYYY-MM-DD" gelir; "T00:00:00" eki yerel saat diliminde parse ettirir
// (eksiz bırakılırsa UTC kabul edilir ve gün kayması yaşanabilir).
export function formatDate(dateOnly: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(
    new Date(`${dateOnly}T00:00:00`)
  );
}

export function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function isOverdue(dueDate: string | null, status: TaskStatus) {
  // done: bitmiş. awaiting_approval: çalışan işini teslim etmiş, top yöneticide —
  // ikisinde de "Gecikti" göstermek yanıltıcı olur.
  if (!dueDate || status === "done" || status === "awaiting_approval") {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`) < today;
}

// Avatar baş harfleri: "Yasin Dikdere" -> "YD", "yasin@x.com" -> "Y"
export function initials(nameOrEmail: string) {
  const clean = nameOrEmail.trim();
  if (!clean) return "?";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toLocaleUpperCase("tr-TR");
  }
  return clean[0].toLocaleUpperCase("tr-TR");
}
