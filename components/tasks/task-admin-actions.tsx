"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { updateTask, deleteTask, type TaskState } from "@/lib/actions/tasks";
import type { TaskPriority } from "@/lib/supabase/types";

type Assignee = { id: string; label: string };

export function TaskAdminActions({
  task,
  roles,
  assignees,
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: TaskPriority;
    due_date: string | null;
    start_date: string | null;
    assignee_id: string;
    role_id: string | null;
  };
  roles: { id: string; name: string }[];
  assignees: Assignee[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TaskState, FormData>(
    updateTask,
    undefined
  );
  const [isDeleting, startDelete] = useTransition();

  // Kaydetme başarılı olduğunda paneli kapat — React'in önerdiği
  // "render sırasında state düzeltme" deseni (effect'te setState yerine).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success && editOpen) {
      setEditOpen(false);
    }
  }

  function handleDelete() {
    if (
      !window.confirm(
        `"${task.title}" görevi ve bildirimleri silinecek. Emin misiniz?`
      )
    ) {
      return;
    }
    startDelete(() => deleteTask(task.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditOpen((open) => !open)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {editOpen ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          {editOpen ? "Vazgeç" : "Düzenle"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Sil
        </button>
      </div>

      {editOpen && (
        <form
          action={formAction}
          className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
        >
          <input type="hidden" name="task_id" value={task.id} />

          <div className="space-y-1">
            <label htmlFor="edit_title" className="text-sm font-medium">
              Başlık
            </label>
            <input
              id="edit_title"
              name="title"
              required
              defaultValue={task.title}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit_description" className="text-sm font-medium">
              Açıklama
            </label>
            <textarea
              id="edit_description"
              name="description"
              rows={3}
              defaultValue={task.description ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit_start_date" className="text-sm font-medium">
              Başlangıç günü{" "}
              <span className="font-normal text-muted-foreground">
                (görev bu güne planlanır)
              </span>
            </label>
            <input
              id="edit_start_date"
              name="start_date"
              type="date"
              defaultValue={task.start_date ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit_priority" className="text-sm font-medium">
                Öncelik
              </label>
              <select
                id="edit_priority"
                name="priority"
                defaultValue={task.priority}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              >
                <option value="low">Düşük</option>
                <option value="normal">Normal</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit_due_date" className="text-sm font-medium">
                Son tarih
              </label>
              <input
                id="edit_due_date"
                name="due_date"
                type="date"
                defaultValue={task.due_date ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edit_role" className="text-sm font-medium">
                İş rolü
              </label>
              <select
                id="edit_role"
                name="role_id"
                defaultValue={task.role_id ?? ""}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              >
                <option value="">— Yok —</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit_assignee" className="text-sm font-medium">
                Atanan kişi
              </label>
              <select
                id="edit_assignee"
                name="assignee_id"
                required
                defaultValue={task.assignee_id}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              >
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      )}
    </div>
  );
}
