"use client";

import { useLanguage, type Lang } from "@/lib/i18n";

const LANGS: Lang[] = ["tr", "en"];

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-medium tracking-wider backdrop-blur-md">
      {LANGS.map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 uppercase transition-colors ${
              active
                ? "bg-logo-red/90 text-white"
                : "text-silver/70 hover:text-white"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
