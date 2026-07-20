"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = { id: string; is_read: boolean };

// AppNav'ın hem masaüstü üst çubuğu hem mobil alt sekme çubuğu aynı canlı
// sayacı gösterir; abonelik burada tek bir yerde tutulur.
export function useUnreadNotifications(userId: string, initialUnreadIds: string[]) {
  const [unreadIds, setUnreadIds] = useState<Set<string>>(
    () => new Set(initialUnreadIds)
  );

  // Sunucu yeniden render edilince (örn. "Tümünü okundu işaretle" sonrası
  // revalidate) güncel listeyi state'e yansıt; realtime olayı gelmese bile
  // rozet düşsün. İçerik karşılaştırması string anahtarla yapılır (dizi
  // referansı her render'da değişir); prop değişimi render sırasında
  // yakalanır (React'in "adjusting state when props change" deseni).
  const initialKey = initialUnreadIds.join(",");
  const [prevKey, setPrevKey] = useState(initialKey);
  if (prevKey !== initialKey) {
    setPrevKey(initialKey);
    setUnreadIds(new Set(initialUnreadIds));
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const row = payload.old as NotificationRow;
            setUnreadIds((prev) => {
              const next = new Set(prev);
              next.delete(row.id);
              return next;
            });
            return;
          }

          const row = payload.new as NotificationRow;
          setUnreadIds((prev) => {
            const next = new Set(prev);
            if (row.is_read) {
              next.delete(row.id);
            } else {
              next.add(row.id);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return unreadIds.size;
}
