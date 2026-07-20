"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useContact } from "@/lib/contact";
import LanguageToggle from "./LanguageToggle";

/** Persistent top bar (logo + login + contact + language toggle), visible across every act. */
export default function TopBar() {
  const { t } = useLanguage();
  const { openContact } = useContact();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between p-6 sm:p-10">
      <div className="pointer-events-auto select-none text-lg font-semibold lowercase tracking-[0.22em]">
        <span className="text-white">rey</span>
        <span className="text-logo-red">po</span>
      </div>
      <div className="pointer-events-auto flex items-center gap-3 sm:gap-4">
        {/* Görev Takip uygulamasına giriş — /login sayfasına yönlendirir.
            Hesap oluşturma yok; yetkilendirme /login ve /app'te sunucu tarafında. */}
        <Link
          href="/login"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-md transition-colors hover:border-logo-red/60 hover:bg-white/10"
        >
          {t.loginLabel}
        </Link>
        <button
          type="button"
          onClick={openContact}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-md transition-colors hover:border-logo-red/60 hover:bg-white/10"
        >
          {t.contact.navLabel}
        </button>
        <LanguageToggle />
      </div>
    </div>
  );
}
