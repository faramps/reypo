"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createTask, type TaskState } from "@/lib/actions/tasks";

type Assignee = { id: string; label: string; roleId: string | null };

// Tek görev oluşturma formu. Bağlama göre proje veya başlangıç günü sabitlenebilir:
//  - Proje detayında:  fixedProjectId verilir (proje seçici gizli)
//  - Takvim gününde:   fixedStartDate verilir (tarih gizli)
//  - Yönetim panelinde: ikisi de serbest (seçiciler görünür)
export function TaskCreateForm({
  assignees,
  roles,
  projects,
  fixedProjectId,
  fixedStartDate,
  onSuccess,
  refresh = false,
  submitLabel = "Görev Ata",
}: {
  assignees: Assignee[];
  roles: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
  fixedProjectId?: string;
  fixedStartDate?: string;
  onSuccess?: () => void;
  refresh?: boolean;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<TaskState, FormData>(
    createTask,
    undefined
  );
  const [roleFilter, setRoleFilter] = useState("");
  const [done, setDone] = useState(false);

  // Başarıyı render sırasında yakala (kod tabanının effect'siz deseni).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.success) setDone(true);
  }

  // Yan etkiler (parent'ı kapat / server component'i yenile) effect'te.
  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
      if (refresh) router.refresh();
    }
  }, [state, onSuccess, refresh, router]);

  const filteredAssignees = useMemo(
    () =>
      roleFilter ? assignees.filter((a) => a.roleId === roleFilter) : assignees,
    [assignees, roleFilter]
  );

  const needsProjectSelect = !fixedProjectId;

  if (needsProjectSelect && (projects ?? []).length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        Önce bir proje oluşturun; görevler bir projeye bağlıdır.
      </p>
    );
  }

  // onSuccess yoksa (panel kendini kapatmıyorsa) başarı mesajı göster.
  if (done && !onSuccess) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Görev atandı.{" "}
        <button
          type="button"
          onClick={() => setDone(false)}
          className="font-medium underline underline-offset-2"
        >
          Bir görev daha ata
        </button>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring";

  return (
    <form action={formAction} className="space-y-3">
      {fixedProjectId && (
        <input type="hidden" name="project_id" value={fixedProjectId} />
      )}
      {fixedStartDate && (
        <input type="hidden" name="start_date" value={fixedStartDate} />
      )}

      {needsProjectSelect && (
        <div className="space-y-1">
          <label htmlFor="tcf_project" className="text-sm font-medium">
            Proje
          </label>
          <select
            id="tcf_project"
            name="project_id"
            required
            defaultValue=""
            className={fieldClass}
          >
            <option value="" disabled>
              Proje seçin
            </option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="tcf_title" className="text-sm font-medium">
          Başlık
        </label>
        <input id="tcf_title" name="title" required className={fieldClass} />
      </div>

      <div className="space-y-1">
        <label htmlFor="tcf_description" className="text-sm font-medium">
          Açıklama
        </label>
        <textarea
          id="tcf_description"
          name="description"
          rows={2}
          className={fieldClass}
        />
      </div>

      {!fixedStartDate && (
        <div className="space-y-1">
          <label htmlFor="tcf_start_date" className="text-sm font-medium">
            Başlangıç günü{" "}
            <span className="font-normal text-muted-foreground">
              (görev bu güne planlanır)
            </span>
          </label>
          <input
            id="tcf_start_date"
            name="start_date"
            type="date"
            className={fieldClass}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="tcf_priority" className="text-sm font-medium">
            Öncelik
          </label>
          <select
            id="tcf_priority"
            name="priority"
            defaultValue="normal"
            className={fieldClass}
          >
            <option value="low">Düşük</option>
            <option value="normal">Normal</option>
            <option value="high">Yüksek</option>
            <option value="urgent">Acil</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="tcf_due_date" className="text-sm font-medium">
            Son tarih
          </label>
          <input
            id="tcf_due_date"
            name="due_date"
            type="date"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="tcf_role_filter" className="text-sm font-medium">
            İş rolüne göre filtrele
          </label>
          <select
            id="tcf_role_filter"
            name="role_id"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={fieldClass}
          >
            <option value="">Tüm roller</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="tcf_assignee" className="text-sm font-medium">
            Atanan kişi
          </label>
          <select
            id="tcf_assignee"
            name="assignee_id"
            required
            defaultValue=""
            className={fieldClass}
          >
            <option value="" disabled>
              Seçin
            </option>
            {filteredAssignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Atanıyor…" : submitLabel}
      </button>
    </form>
  );
}
