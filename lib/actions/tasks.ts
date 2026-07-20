"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import type { TaskPriority } from "@/lib/supabase/types";

export type TaskState = { error?: string; success?: boolean } | undefined;

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
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const roleId = String(formData.get("role_id") ?? "") || null;

  if (!projectId || !title || !assigneeId) {
    return { error: "Başlık ve atanan kişi zorunlu." };
  }

  // Ürün kararı (2026-07-09): yönetici kendine görev atayamaz.
  if (assigneeId === user.id) {
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
      assignee_id: assigneeId,
      role_id: roleId,
      created_by: user.id,
    })
    .select("id, title")
    .single();

  if (error || !task) {
    console.error("createTask insert hatası:", error);
    return { error: "Görev oluşturulamadı." };
  }

  // notifications tablosunda authenticated insert policy'si yok (bkz. migration) —
  // atanan kişi admin'den farklı olduğu için bu ekleme RLS'i atlayan admin client ile yapılır.
  await createAdminClient()
    .from("notifications")
    .insert({
      user_id: assigneeId,
      type: "task_assigned",
      title: "Yeni görev atandı",
      body: task.title,
      task_id: task.id,
    });

  await sendPushToUser(assigneeId, {
    title: "Yeni görev atandı",
    body: task.title,
    taskId: task.id,
  });

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
  const assigneeId = String(formData.get("assignee_id") ?? "");
  const roleId = String(formData.get("role_id") ?? "") || null;

  if (!taskId || !title || !assigneeId) {
    return { error: "Başlık ve atanan kişi zorunlu." };
  }
  if (assigneeId === user.id) {
    return { error: "Kendinize görev atayamazsınız." };
  }

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, project_id, assignee_id")
    .eq("id", taskId)
    .single();

  if (!existing) {
    return { error: "Görev bulunamadı." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description,
      priority,
      due_date: dueDate,
      start_date: startDate,
      assignee_id: assigneeId,
      role_id: roleId,
    })
    .eq("id", taskId);

  if (error) {
    console.error("updateTask update hatası:", error);
    return { error: "Görev güncellenemedi." };
  }

  const assigneeChanged = existing.assignee_id !== assigneeId;
  const notifTitle = assigneeChanged ? "Yeni görev atandı" : "Görev güncellendi";

  await createAdminClient()
    .from("notifications")
    .insert({
      user_id: assigneeId,
      type: assigneeChanged ? ("task_assigned" as const) : ("task_updated" as const),
      title: notifTitle,
      body: title,
      task_id: taskId,
    });

  await sendPushToUser(assigneeId, {
    title: notifTitle,
    body: title,
    taskId,
  });

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

  // Göreve bağlı bildirimler FK cascade ile birlikte silinir.
  await supabase.from("tasks").delete().eq("id", taskId);

  revalidatePath("/app");
  revalidatePath(`/app/projects/${task.project_id}`);
  revalidatePath("/app/admin/calendar");
  redirect(`/app/projects/${task.project_id}`);
}

// =========================================================
// Onay + revize akışı (PLAN.md #11.1 güncellendi: onay akışı VAR).
// todo/revision --(çalışan: Tamamladım)--> awaiting_approval
// awaiting_approval --(admin: approve)--> done
// awaiting_approval --(admin: requestRevision + not)--> revision
// "Başladım" adımı kaldırıldı (2026-07-14): in_progress durumu yalnızca
// eski kayıtların görüntülenmesi için tanınır; yeni geçiş üretilmez.
// =========================================================

// Ortak: oturumdaki kullanıcı + görev + admin bilgisini yükler.
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
    .select("id, project_id, title, status, assignee_id, created_by")
    .eq("id", taskId)
    .single();

  if (!task) {
    throw new Error("Görev bulunamadı.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  return { supabase, user, task, isAdmin: profile?.system_role === "admin" };
}

// Çalışan aksiyonlarının (başladı/onaya gönderdi) bildirim alıcısı: görevi
// atayan yönetici (ürün kararı 2026-07-14: tüm yöneticiler DEĞİL). Atayan
// silinmişse (created_by null) tüm yöneticilere düşer; işlemi yapanın
// kendisine bildirim gitmez. Görünürlük değişmez: tüm yöneticiler tüm
// görevleri görmeye devam eder (RLS).
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

// Çalışan (veya admin): "Tamamladım" — görevi yönetici onayına gönderir.
// completed_at burada set EDİLMEZ; yalnızca onayda set edilir.
// note: isteğe bağlı cevap (özellikle revize sonrası "şunu düzelttim" notu);
// geçmişte çalışanın satırında görünür ve yöneticiye giden bildirimde yer alır.
export async function submitForApproval(taskId: string, note?: string) {
  const { supabase, user, task, isAdmin } = await loadTaskActor(taskId);

  if (!isAdmin && task.assignee_id !== user.id) {
    throw new Error("Bu görevi güncelleme yetkiniz yok.");
  }
  if (
    task.status !== "todo" &&
    task.status !== "in_progress" &&
    task.status !== "revision"
  ) {
    throw new Error("Görev şu anda onaya gönderilemez.");
  }

  const trimmedNote = note?.trim() || null;

  const { error } = await supabase
    .from("tasks")
    .update({ status: "awaiting_approval" })
    .eq("id", taskId);
  if (error) {
    throw new Error("Görev güncellenemedi.");
  }

  // Geçmişe "onaya gönderildi" kaydı (append-only).
  await supabase.from("task_revisions").insert({
    task_id: taskId,
    author_id: user.id,
    kind: "submitted",
    note: trimmedNote,
  });

  // Onay bekleyen görevi atayan yöneticiye bildir (gönderenin kendisi hariç).
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

  revalidateTask(taskId, task.project_id);
}

// Yönetici: onaya düşen görevi onaylar -> done. İsteğe bağlı not.
export async function approveTask(taskId: string, note?: string) {
  const { supabase, user, task, isAdmin } = await loadTaskActor(taskId);

  if (!isAdmin) {
    throw new Error("Bu işlem için yönetici yetkisi gerekir.");
  }
  if (task.status !== "awaiting_approval") {
    throw new Error("Yalnızca onay bekleyen görevler onaylanabilir.");
  }

  const trimmed = note?.trim() || null;

  const { error } = await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) {
    throw new Error("Görev güncellenemedi.");
  }

  await supabase.from("task_revisions").insert({
    task_id: taskId,
    author_id: user.id,
    kind: "approved",
    note: trimmed,
  });

  // Atanan kişiyi bilgilendir (yöneticinin kendisi atanan değilse).
  if (task.assignee_id !== user.id) {
    await createAdminClient().from("notifications").insert({
      user_id: task.assignee_id,
      type: "task_approved",
      title: "Göreviniz onaylandı",
      body: task.title,
      task_id: task.id,
    });
    await sendPushToUser(task.assignee_id, {
      title: "Göreviniz onaylandı",
      body: task.title,
      taskId: task.id,
    });
  }

  revalidateTask(taskId, task.project_id);
}

// Yönetici: onaya düşen görevi revize notuyla geri gönderir -> revision. Not zorunlu.
export async function requestRevision(taskId: string, note: string) {
  const { supabase, user, task, isAdmin } = await loadTaskActor(taskId);

  if (!isAdmin) {
    throw new Error("Bu işlem için yönetici yetkisi gerekir.");
  }
  if (task.status !== "awaiting_approval") {
    throw new Error("Yalnızca onay bekleyen görev için revize istenebilir.");
  }

  const trimmed = note?.trim();
  if (!trimmed) {
    throw new Error("Revize notu zorunlu.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "revision" })
    .eq("id", taskId);
  if (error) {
    throw new Error("Görev güncellenemedi.");
  }

  await supabase.from("task_revisions").insert({
    task_id: taskId,
    author_id: user.id,
    kind: "revision_requested",
    note: trimmed,
  });

  if (task.assignee_id !== user.id) {
    await createAdminClient().from("notifications").insert({
      user_id: task.assignee_id,
      type: "task_revision_requested",
      title: "Görev için revize istendi",
      body: trimmed,
      task_id: task.id,
    });
    await sendPushToUser(task.assignee_id, {
      title: "Görev için revize istendi",
      body: trimmed,
      taskId: task.id,
    });
  }

  revalidateTask(taskId, task.project_id);
}

// Yönetici: tamamlanmış görevi yeniden açar -> todo. completed_at sıfırlanır.
export async function reopenTask(taskId: string) {
  const { supabase, user, task, isAdmin } = await loadTaskActor(taskId);

  if (!isAdmin) {
    throw new Error("Bu işlem için yönetici yetkisi gerekir.");
  }
  if (task.status !== "done") {
    throw new Error("Yalnızca tamamlanmış görev yeniden açılabilir.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "todo", completed_at: null })
    .eq("id", taskId);
  if (error) {
    throw new Error("Görev güncellenemedi.");
  }

  if (task.assignee_id !== user.id) {
    await createAdminClient().from("notifications").insert({
      user_id: task.assignee_id,
      type: "task_updated",
      title: "Görev yeniden açıldı",
      body: task.title,
      task_id: task.id,
    });
    await sendPushToUser(task.assignee_id, {
      title: "Görev yeniden açıldı",
      body: task.title,
      taskId: task.id,
    });
  }

  revalidateTask(taskId, task.project_id);
}
