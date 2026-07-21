"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import type { Database, TaskPriority } from "@/lib/supabase/types";

export type TaskState = { error?: string; success?: boolean } | undefined;

type DbClient = Awaited<ReturnType<typeof createClient>>;

// Form'dan atanan kişi id'lerini oku (çoklu seçim: assignee_id çok kez gelir),
// benzersizleştir ve boşları at.
function readAssigneeIds(formData: FormData): string[] {
  return Array.from(
    new Set(
      formData
        .getAll("assignee_id")
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  );
}

// Bir görevin atanan kişi id'leri (bildirim alıcıları için).
async function taskAssigneeIds(
  supabase: DbClient,
  taskId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", taskId);
  return (data ?? []).map((r) => r.user_id);
}

export async function createTask(
  _prevState: TaskState,
  formData: FormData
): Promise<TaskState> {
  const { supabase, user } = await requireAdmin();

  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const startDate = String(formData.get("start_date") ?? "") || null;
  const assigneeIds = readAssigneeIds(formData);
  const roleId = String(formData.get("role_id") ?? "") || null;

  if (!projectId || !title || assigneeIds.length === 0) {
    return { error: "Başlık ve en az bir atanan kişi zorunlu." };
  }

  // Ürün kararı (2026-07-09): yönetici kendine görev atayamaz.
  if (assigneeIds.includes(user.id)) {
    return { error: "Kendinize görev atayamazsınız." };
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      title,
      description,
      priority,
      due_date: dueDate,
      start_date: startDate,
      role_id: roleId,
      created_by: user.id,
    })
    .select("id, title")
    .single();

  if (error || !task) {
    console.error("createTask insert hatası:", error);
    return { error: "Görev oluşturulamadı." };
  }

  const { error: assignErr } = await supabase
    .from("task_assignees")
    .insert(assigneeIds.map((uid) => ({ task_id: task.id, user_id: uid })));

  if (assignErr) {
    console.error("createTask atama hatası:", assignErr);
    // Görev atamasız kalmasın: oluşturulan görevi geri al.
    await supabase.from("tasks").delete().eq("id", task.id);
    return { error: "Görev atanamadı." };
  }

  // notifications tablosunda authenticated insert policy'si yok (bkz. migration) —
  // atananlar admin'den farklı olduğu için bu ekleme RLS'i atlayan admin client ile yapılır.
  await createAdminClient()
    .from("notifications")
    .insert(
      assigneeIds.map((uid) => ({
        user_id: uid,
        type: "task_assigned" as const,
        title: "Yeni görev atandı",
        body: task.title,
        task_id: task.id,
      }))
    );

  await Promise.all(
    assigneeIds.map((uid) =>
      sendPushToUser(uid, {
        title: "Yeni görev atandı",
        body: task.title,
        taskId: task.id,
      })
    )
  );

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/admin/calendar");
  // Başarı bilgisi form panelinin kendini kapatması için kullanılır.
  return { success: true };
}

export async function updateTask(
  _prevState: TaskState,
  formData: FormData
): Promise<TaskState> {
  const { supabase, user } = await requireAdmin();

  const taskId = String(formData.get("task_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const startDate = String(formData.get("start_date") ?? "") || null;
  const assigneeIds = readAssigneeIds(formData);
  const roleId = String(formData.get("role_id") ?? "") || null;

  if (!taskId || !title || assigneeIds.length === 0) {
    return { error: "Başlık ve en az bir atanan kişi zorunlu." };
  }
  if (assigneeIds.includes(user.id)) {
    return { error: "Kendinize görev atayamazsınız." };
  }

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("id", taskId)
    .single();

  if (!existing) {
    return { error: "Görev bulunamadı." };
  }

  const { data: currentRows } = await supabase
    .from("task_assignees")
    .select("user_id")
    .eq("task_id", taskId);
  const current = new Set((currentRows ?? []).map((r) => r.user_id));
  const next = new Set(assigneeIds);
  const toAdd = assigneeIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));
  const kept = assigneeIds.filter((id) => current.has(id));

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description,
      priority,
      due_date: dueDate,
      start_date: startDate,
      role_id: roleId,
    })
    .eq("id", taskId);

  if (error) {
    console.error("updateTask update hatası:", error);
    return { error: "Görev güncellenemedi." };
  }

  if (toAdd.length > 0) {
    const { error: addErr } = await supabase
      .from("task_assignees")
      .insert(toAdd.map((uid) => ({ task_id: taskId, user_id: uid })));
    if (addErr) {
      console.error("updateTask atama ekleme hatası:", addErr);
      return { error: "Atananlar güncellenemedi." };
    }
  }
  if (toRemove.length > 0) {
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .in("user_id", toRemove);
  }

  // Bildirimler: yeni eklenenlere "atandı", kalanlara "güncellendi",
  // çıkarılanlara "görevden çıkarıldınız".
  const notifRows: Database["public"]["Tables"]["notifications"]["Insert"][] = [
    ...toAdd.map((uid) => ({
      user_id: uid,
      type: "task_assigned" as const,
      title: "Yeni görev atandı",
      body: title,
      task_id: taskId,
    })),
    ...kept.map((uid) => ({
      user_id: uid,
      type: "task_updated" as const,
      title: "Görev güncellendi",
      body: title,
      task_id: taskId,
    })),
    ...toRemove.map((uid) => ({
      user_id: uid,
      type: "task_updated" as const,
      title: "Görevden çıkarıldınız",
      body: title,
      task_id: taskId,
    })),
  ];
  if (notifRows.length > 0) {
    await createAdminClient().from("notifications").insert(notifRows);
  }
  await Promise.all([
    ...toAdd.map((uid) =>
      sendPushToUser(uid, { title: "Yeni görev atandı", body: title, taskId })
    ),
    ...kept.map((uid) =>
      sendPushToUser(uid, { title: "Görev güncellendi", body: title, taskId })
    ),
  ]);

  revalidatePath("/app");
  revalidatePath(`/app/tasks/${taskId}`);
  revalidatePath(`/app/projects/${existing.project_id}`);
  revalidatePath("/app/admin/calendar");
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const { supabase } = await requireAdmin();

  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .single();

  if (!task) {
    redirect("/app/projects");
  }

  // Göreve bağlı atamalar/bildirimler FK cascade ile birlikte silinir.
  await supabase.from("tasks").delete().eq("id", taskId);

  revalidatePath("/app");
  revalidatePath(`/app/projects/${task.project_id}`);
  revalidatePath("/app/admin/calendar");
  redirect(`/app/projects/${task.project_id}`);
}

// =========================================================
// Onay + revize akışı — çok kişili (2026-07-21).
// Her atanan KENDİ task_assignees satırını ilerletir; tasks.status DB trigger'ı
// ile rollup olarak hesaplanır (herkes awaiting -> awaiting_approval).
//   todo/revision --(atanan: Tamamladım)--> (kişi) awaiting_approval
//   HERKES awaiting olunca görev awaiting_approval -> yönetici bilgilendirilir.
//   Yönetici: Onayla -> herkes done | kişi bazlı Revize -> seçilenler revision.
// "in_progress" yalnızca "biri bitirdi, diğeri bekliyor" ara durumunu ve eski
// kayıtları temsil eder; doğrudan bu duruma geçiş üretilmez.
// =========================================================

// Ortak: oturumdaki kullanıcı + görev + admin + çağıranın kendi atama satırı.
async function loadTaskActor(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Oturum açılmamış.");
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, project_id, title, status, created_by")
    .eq("id", taskId)
    .single();

  if (!task) {
    throw new Error("Görev bulunamadı.");
  }

  const [{ data: profile }, { data: myRow }] = await Promise.all([
    supabase.from("profiles").select("system_role").eq("id", user.id).single(),
    supabase
      .from("task_assignees")
      .select("status")
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    supabase,
    user,
    task,
    isAdmin: profile?.system_role === "admin",
    isAssignee: !!myRow,
    myAssigneeStatus: myRow?.status ?? null,
  };
}

// Çalışan aksiyonlarının (onaya gönderdi) bildirim alıcısı: görevi atayan
// yönetici (ürün kararı 2026-07-14: tüm yöneticiler DEĞİL). Atayan silinmişse
// (created_by null) tüm yöneticilere düşer; işlemi yapanın kendisine gitmez.
async function assignerRecipients(
  createdBy: string | null,
  actorId: string
): Promise<string[]> {
  let ids: string[];
  if (createdBy) {
    ids = [createdBy];
  } else {
    const { data: admins } = await createAdminClient()
      .from("profiles")
      .select("id")
      .eq("system_role", "admin");
    ids = (admins ?? []).map((a) => a.id);
  }
  return ids.filter((id) => id !== actorId);
}

function revalidateTask(taskId: string, projectId: string) {
  revalidatePath("/app");
  revalidatePath(`/app/tasks/${taskId}`);
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/admin"); // Yönetim hub'ındaki "Onay Bekleyenler" listesi güncel kalsın.
  revalidatePath("/app/admin/people");
  revalidatePath("/app/admin/calendar");
  revalidatePath("/app/calendar");
}

// Atanan: "Tamamladım" — kendi işini yönetici onayına gönderir (kişi bazlı).
// completed_at burada set EDİLMEZ; yalnızca tüm görev onaylanınca set edilir.
// note: isteğe bağlı cevap (özellikle revize sonrası "şunu düzelttim" notu).
// Yöneticiye bildirim YALNIZCA herkes tamamlayınca (rollup awaiting_approval) gider.
export async function submitForApproval(taskId: string, note?: string) {
  const { supabase, user, task, isAssignee, myAssigneeStatus } =
    await loadTaskActor(taskId);

  if (!isAssignee) {
    throw new Error("Bu görevde atanmış değilsiniz.");
  }
  if (
    myAssigneeStatus !== "todo" &&
    myAssigneeStatus !== "in_progress" &&
    myAssigneeStatus !== "revision"
  ) {
    throw new Error("Görev şu anda onaya gönderilemez.");
  }

  const trimmedNote = note?.trim() || null;

  const { error } = await supabase
    .from("task_assignees")
    .update({ status: "awaiting_approval" })
    .eq("task_id", taskId)
    .eq("user_id", user.id);
  if (error) {
    throw new Error("Görev güncellenemedi.");
  }

  // Geçmişe "onaya gönderildi" kaydı (append-only); hedef = gönderen kişi.
  await supabase.from("task_revisions").insert({
    task_id: taskId,
    author_id: user.id,
    target_user_id: user.id,
    kind: "submitted",
    note: trimmedNote,
  });

  // Rollup trigger tasks.status'u güncelledi; yalnızca HERKES bitince bildir.
  const { data: updated } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();

  if (updated?.status === "awaiting_approval") {
    const recipients = await assignerRecipients(task.created_by, user.id);
    if (recipients.length > 0) {
      const notifBody = trimmedNote
        ? `${task.title} — ${trimmedNote}`
        : task.title;
      await createAdminClient().from("notifications").insert(
        recipients.map((id) => ({
          user_id: id,
          type: "task_submitted" as const,
          title: "Görev onayınızı bekliyor",
          body: notifBody,
          task_id: task.id,
        }))
      );
      await Promise.all(
        recipients.map((id) =>
          sendPushToUser(id, {
            title: "Görev onayınızı bekliyor",
            body: notifBody,
            taskId: task.id,
          })
        )
      );
    }
  }

  revalidateTask(taskId, task.project_id);
}

// Yönetici: onaya düşen görevi onaylar -> tüm atananlar done (rollup done).
export async function approveTask(taskId: string, note?: string) {
  const { supabase, user, task, isAdmin } = await loadTaskActor(taskId);

  if (!isAdmin) {
    throw new Error("Bu işlem için yönetici yetkisi gerekir.");
  }
  if (task.status !== "awaiting_approval") {
    throw new Error("Yalnızca onay bekleyen görevler onaylanabilir.");
  }

  const trimmed = note?.trim() || null;
  const recipients = (await taskAssigneeIds(supabase, taskId)).filter(
    (id) => id !== user.id
  );

  const { error } = await supabase
    .from("task_assignees")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("task_id", taskId);
  if (error) {
    throw new Error("Görev güncellenemedi.");
  }

  await supabase.from("task_revisions").insert({
    task_id: taskId,
    author_id: user.id,
    target_user_id: null,
    kind: "approved",
    note: trimmed,
  });

  if (recipients.length > 0) {
    await createAdminClient().from("notifications").insert(
      recipients.map((id) => ({
        user_id: id,
        type: "task_approved" as const,
        title: "Göreviniz onaylandı",
        body: task.title,
        task_id: task.id,
      }))
    );
    await Promise.all(
      recipients.map((id) =>
        sendPushToUser(id, {
          title: "Göreviniz onaylandı",
          body: task.title,
          taskId: task.id,
        })
      )
    );
  }

  revalidateTask(taskId, task.project_id);
}

// Yönetici: onaya düşen görevi kişi bazlı revize notlarıyla geri gönderir.
// entries: revize edilecek her kişi + notu (ortak revizede aynı not tekrarlanır).
// Not verilmeyen kişiler awaiting_approval'da kalır (kabul-bekliyor / kısmi onay).
export async function requestRevisions(
  taskId: string,
  entries: { userId: string; note: string }[]
) {
  const { supabase, user, task, isAdmin } = await loadTaskActor(taskId);

  if (!isAdmin) {
    throw new Error("Bu işlem için yönetici yetkisi gerekir.");
  }
  if (task.status !== "awaiting_approval") {
    throw new Error("Yalnızca onay bekleyen görev için revize istenebilir.");
  }

  const valid = entries
    .map((e) => ({ userId: String(e.userId), note: e.note.trim() }))
    .filter((e) => e.userId && e.note);
  if (valid.length === 0) {
    throw new Error("En az bir kişiye revize notu yazın.");
  }

  // Yalnızca gerçekten atanmış kişilere revize verilebilir.
  const assigneeSet = new Set(await taskAssigneeIds(supabase, taskId));
  for (const e of valid) {
    if (!assigneeSet.has(e.userId)) {
      throw new Error("Geçersiz atanan kişi.");
    }
  }

  for (const e of valid) {
    const { error } = await supabase
      .from("task_assignees")
      .update({ status: "revision", completed_at: null })
      .eq("task_id", taskId)
      .eq("user_id", e.userId);
    if (error) {
      throw new Error("Görev güncellenemedi.");
    }
    await supabase.from("task_revisions").insert({
      task_id: taskId,
      author_id: user.id,
      target_user_id: e.userId,
      kind: "revision_requested",
      note: e.note,
    });
  }

  const notifTargets = valid.filter((e) => e.userId !== user.id);
  if (notifTargets.length > 0) {
    await createAdminClient().from("notifications").insert(
      notifTargets.map((e) => ({
        user_id: e.userId,
        type: "task_revision_requested" as const,
        title: "Görev için revize istendi",
        body: e.note,
        task_id: taskId,
      }))
    );
    await Promise.all(
      notifTargets.map((e) =>
        sendPushToUser(e.userId, {
          title: "Görev için revize istendi",
          body: e.note,
          taskId,
        })
      )
    );
  }

  revalidateTask(taskId, task.project_id);
}

// Yönetici: tamamlanmış görevi yeniden açar -> tüm atananlar todo. completed_at sıfırlanır.
export async function reopenTask(taskId: string) {
  const { supabase, user, task, isAdmin } = await loadTaskActor(taskId);

  if (!isAdmin) {
    throw new Error("Bu işlem için yönetici yetkisi gerekir.");
  }
  if (task.status !== "done") {
    throw new Error("Yalnızca tamamlanmış görev yeniden açılabilir.");
  }

  const recipients = (await taskAssigneeIds(supabase, taskId)).filter(
    (id) => id !== user.id
  );

  const { error } = await supabase
    .from("task_assignees")
    .update({ status: "todo", completed_at: null })
    .eq("task_id", taskId);
  if (error) {
    throw new Error("Görev güncellenemedi.");
  }

  if (recipients.length > 0) {
    await createAdminClient().from("notifications").insert(
      recipients.map((id) => ({
        user_id: id,
        type: "task_updated" as const,
        title: "Görev yeniden açıldı",
        body: task.title,
        task_id: task.id,
      }))
    );
    await Promise.all(
      recipients.map((id) =>
        sendPushToUser(id, {
          title: "Görev yeniden açıldı",
          body: task.title,
          taskId: task.id,
        })
      )
    );
  }

  revalidateTask(taskId, task.project_id);
}
