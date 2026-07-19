"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { TaskCreateForm } from "@/components/task-create-form";
import {
  updateProject,
  setProjectArchived,
  deleteProject,
  type ProjectState,
} from "@/lib/actions/projects";

type Assignee = { id: string; label: string; roleId: string | null };

export function ProjectHeader({
  name,
  description,
  isArchived,
  isAdmin,
  projectId,
  roles,
  assignees,
}: {
  name: string;
  description: string | null;
  isArchived: boolean;
  isAdmin: boolean;
  projectId: string;
  roles: { id: string; name: string }[];
  assignees: Assignee[];
}) {
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editState, editAction, editPending] = useActionState<
    ProjectState,
    FormData
  >(updateProject, undefined);
  const [isMutating, startMutation] = useTransition();

  // Kaydetme başarılı olduğunda paneli kapat — React'in önerdiği
  // "render sırasında state düzeltme" deseni (effect'te setState yerine).
  const [prevEditState, setPrevEditState] = useState(editState);
  if (editState !== prevEditState) {
    setPrevEditState(editState);
    if (editState?.success && editOpen) {
      setEditOpen(false);
    }
  }

  function handleDelete() {
    if (
      !window.confirm(
        `"${name}" projesi ve içindeki TÜM görevler silinecek. Emin misiniz?`
      )
    ) {
      return;
    }
    startMutation(() => deleteProject(projectId));
  }

  function handleArchiveToggle() {
    startMutation(() => setProjectArchived(projectId, !isArchived));
  }

  const secondaryButtonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="break-words text-lg font-semibold">{name}</h1>
            {isArchived && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Arşivlenmiş
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {isAdmin && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {!isArchived && (
              <button
                type="button"
                onClick={() => setTaskFormOpen((open) => !open)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  taskFormOpen
                    ? "border border-border bg-card text-foreground"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {taskFormOpen ? (
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
            )}
            <button
              type="button"
              onClick={() => setEditOpen((open) => !open)}
              className={secondaryButtonClass}
            >
              <Pencil className="h-4 w-4" />
              Düzenle
            </button>
            <button
              type="button"
              onClick={handleArchiveToggle}
              disabled={isMutating}
              className={secondaryButtonClass}
            >
              {isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Arşivden Çıkar
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Arşivle
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isMutating}
              className={`${secondaryButtonClass} text-destructive hover:bg-destructive/5`}
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </button>
          </div>
        )}
      </div>

      {isAdmin && editOpen && (
        <form
          action={editAction}
          className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <div className="space-y-1">
            <label htmlFor="project_name" className="text-sm font-medium">
              Proje adı
            </label>
            <input
              id="project_name"
              name="name"
              required
              defaultValue={name}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="project_description" className="text-sm font-medium">
              Açıklama
            </label>
            <textarea
              id="project_description"
              name="description"
              rows={2}
              defaultValue={description ?? ""}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {editState?.error && (
            <p className="text-sm text-destructive">{editState.error}</p>
          )}
          <button
            type="submit"
            disabled={editPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {editPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      )}

      {isAdmin && !isArchived && taskFormOpen && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <TaskCreateForm
            fixedProjectId={projectId}
            roles={roles}
            assignees={assignees}
            onSuccess={() => setTaskFormOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
