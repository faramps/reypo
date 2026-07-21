"use client";

import { useMemo, useState } from "react";

type Assignee = { id: string; label: string; roleId?: string | null };

// Çoklu atanan seçici: iş rolüne göre filtre + onay kutuları. Seçim durumu
// bileşende tutulur; forma her seçili kişi için gizli `assignee_id` input'u
// basılır (filtre gizlese bile seçim korunur). N=1 (tek kişi) de desteklenir.
export function AssigneeMultiSelect({
  assignees,
  roles,
  defaultSelected = [],
  label = "Atanan kişiler",
}: {
  assignees: Assignee[];
  roles: { id: string; name: string }[];
  defaultSelected?: string[];
  label?: string;
}) {
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected)
  );

  const filtered = useMemo(
    () =>
      roleFilter
        ? assignees.filter((a) => a.roleId === roleFilter)
        : assignees,
    [assignees, roleFilter]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const fieldClass =
    "rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {roles.length > 0 && (
          <select
            aria-label="İş rolüne göre filtrele"
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
        )}
      </div>

      <div className="max-h-52 space-y-0.5 overflow-auto rounded-md border border-input p-1.5">
        {filtered.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">
            Bu filtrede kişi yok.
          </p>
        ) : (
          filtered.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() => toggle(a.id)}
                className="h-4 w-4 shrink-0"
              />
              <span className="min-w-0 truncate text-sm">{a.label}</span>
            </label>
          ))
        )}
      </div>

      {/* Forma gönderilen gerçek değerler: her seçili kişi için bir gizli input. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="assignee_id" value={id} />
      ))}

      <p className="text-xs text-muted-foreground">
        {selected.size > 0 ? `${selected.size} kişi seçildi` : "En az bir kişi seçin"}
      </p>
    </div>
  );
}
