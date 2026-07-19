"use client";

import { useSyncExternalStore } from "react";

// navigator/matchMedia SSR'da yok; useSyncExternalStore server snapshot'ı
// (false) hydration'da kullanıp hemen ardından gerçek değere geçer — bu,
// useEffect + setState'e göre hydration uyumsuzluğu olmadan doğru yoldur.
function subscribeNoop() {
  return () => {};
}

function getIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function getIsStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

function getServerSnapshot() {
  return false;
}

export function InstallPrompt() {
  const isIOS = useSyncExternalStore(subscribeNoop, getIsIOS, getServerSnapshot);
  const isStandalone = useSyncExternalStore(
    subscribeNoop,
    getIsStandalone,
    getServerSnapshot
  );

  if (isStandalone) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs text-sm">
      <p className="font-medium">Ana Ekrana Ekle</p>
      {isIOS ? (
        <p className="mt-1 text-muted-foreground">
          Paylaş düğmesine <span aria-hidden>⎋</span> dokunun, ardından
          &quot;Ana Ekrana Ekle&quot; <span aria-hidden>➕</span> seçeneğini
          kullanın. Bildirimler yalnızca uygulama ana ekrana eklendikten sonra
          çalışır.
        </p>
      ) : (
        <p className="mt-1 text-muted-foreground">
          Tarayıcınızın menüsünden &quot;Ana ekrana ekle&quot; veya
          &quot;Yükle&quot; seçeneğini kullanabilirsiniz.
        </p>
      )}
    </div>
  );
}
