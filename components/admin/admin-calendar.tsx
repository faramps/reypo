"use client";

import { TaskCalendar, type CalDay } from "@/components/task-calendar";
import { TaskCreateForm } from "@/components/task-create-form";

export type { CalDay, CalTask } from "@/components/task-calendar";

// Yönetici takvimi: paylaşılan TaskCalendar + seçili güne görev atama formu.
export function AdminCalendar({
  monthLabel,
  currentMonth,
  prevMonth,
  nextMonth,
  thisMonth,
  days,
  projects,
  assignees,
  roles,
}: {
  monthLabel: string;
  currentMonth: string;
  prevMonth: string;
  nextMonth: string;
  thisMonth: string;
  days: CalDay[];
  projects: { id: string; name: string }[];
  assignees: { id: string; label: string; roleId: string | null }[];
  roles: { id: string; name: string }[];
}) {
  return (
    <TaskCalendar
      title="Kişilere görev planı"
      subtitle="Bir güne dokunup o gün için görev atayın."
      basePath="/app/admin/calendar"
      monthLabel={monthLabel}
      currentMonth={currentMonth}
      prevMonth={prevMonth}
      nextMonth={nextMonth}
      thisMonth={thisMonth}
      days={days}
      renderFooter={(date) => (
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium">Bu güne görev ata</p>
          <TaskCreateForm
            key={date}
            fixedStartDate={date}
            projects={projects}
            assignees={assignees}
            roles={roles}
            refresh
          />
        </div>
      )}
    />
  );
}
