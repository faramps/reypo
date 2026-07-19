"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { TaskCreateForm } from "@/components/task-create-form";

// Yönetim panelindeki tek "Yeni Görev" giriş noktası: proje + kişi + gün tek formda.
export function NewTaskPanel({
  projects,
  assignees,
  roles,
}: {
  projects: { id: string; name: string }[];
  assignees: { id: string; label: string; roleId: string | null }[];
  roles: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          open
            ? "border border-border bg-card text-foreground"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {open ? (
          <>
            <X className="h-4 w-4" />
            Vazgeç
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Yeni Görev Ata
          </>
        )}
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <TaskCreateForm
            projects={projects}
            assignees={assignees}
            roles={roles}
            refresh
          />
        </div>
      )}
    </div>
  );
}
