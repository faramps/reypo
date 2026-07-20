"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { statusBadgeClass, statusLabel } from "@/lib/task-labels";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

export type CalTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  // Hücrede ve gün listesinde başlığın yanında gösterilir (admin: atanan kişi,
  // kullanıcı: proje adı). Boşsa yalnızca başlık gösterilir.
  subtitle?: string;
};

export type CalDay = {
  date: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  isToday: boolean;
  tasks: CalTask[];
};

const weekdayHeaders = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function formatLongDate(dateStr: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "full" }).format(
    new Date(`${dateStr}T00:00:00`)
  );
}

// Aylık takvim ızgarası (salt-okunur). Admin, seçili gün için bir form eklemek
// üzere renderFooter geçirir (Atama Takvimi'nde güne görev atama paneli).
export function TaskCalendar({
  title,
  subtitle,
  basePath,
  monthLabel,
  currentMonth,
  prevMonth,
  nextMonth,
  thisMonth,
  days,
  renderFooter,
}: {
  title: string;
  subtitle?: string;
  basePath: string;
  monthLabel: string;
  currentMonth: string;
  prevMonth: string;
  nextMonth: string;
  thisMonth: string;
  days: CalDay[];
  renderFooter?: (date: string) => ReactNode;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  const navButtonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-accent";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold capitalize">{monthLabel}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {subtitle ?? title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentMonth !== thisMonth && (
            <Link
              href={`${basePath}?month=${thisMonth}`}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              Bugün
            </Link>
          )}
          <Link
            href={`${basePath}?month=${prevMonth}`}
            aria-label="Önceki ay"
            className={navButtonClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`${basePath}?month=${nextMonth}`}
            aria-label="Sonraki ay"
            className={navButtonClass}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-[11px] font-medium text-muted-foreground">
          {weekdayHeaders.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((d) => {
            const isSelected = d.date === selectedDate;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className={`flex min-h-20 flex-col gap-1 border-b border-r border-border p-1.5 text-left align-top transition-colors last:border-r-0 hover:bg-accent/40 ${
                  d.inMonth ? "" : "bg-muted/30 text-muted-foreground"
                } ${d.isToday ? "bg-accent/50" : ""} ${
                  isSelected ? "ring-2 ring-inset ring-ring" : ""
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs ${
                    d.isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "font-medium"
                  }`}
                >
                  {d.day}
                </span>
                <span className="flex flex-col gap-0.5">
                  {d.tasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      title={t.subtitle ? `${t.subtitle} · ${t.title}` : t.title}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${statusBadgeClass[t.status]}`}
                    >
                      {t.subtitle ? `${t.subtitle} · ${t.title}` : t.title}
                    </span>
                  ))}
                  {d.tasks.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{d.tasks.length - 3} daha
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold capitalize">
              {formatLongDate(selectedDay.date)}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              aria-label="Kapat"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedDay.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu güne planlanmış görev yok.
            </p>
          ) : (
            <ul className="space-y-2">
              {selectedDay.tasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/app/tasks/${t.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm transition-colors hover:bg-accent/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {t.title}
                      </span>
                      {t.subtitle && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.subtitle}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[t.status]}`}
                    >
                      {statusLabel[t.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {renderFooter?.(selectedDay.date)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Gün ayrıntısı için takvimden bir gün seçin.
        </p>
      )}
    </div>
  );
}
