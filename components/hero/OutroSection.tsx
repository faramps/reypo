"use client";

import { useLanguage } from "@/lib/i18n";
import { useContact } from "@/lib/contact";

export default function OutroSection() {
  const { t } = useLanguage();
  const { openContact } = useContact();
  const year = new Date().getFullYear();

  return (
    <section className="pointer-events-none relative flex min-h-[90svh] flex-col items-center justify-center px-6 text-center">
      <p className="services-reveal text-xs font-medium uppercase tracking-[0.32em] text-silver/50">
        {t.outroKicker}
      </p>
      <h2 className="services-reveal mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
        {t.outroHeading}
      </h2>
      <p className="services-reveal mt-6 max-w-xl text-base leading-7 text-silver/70">
        {t.outroSub}
      </p>
      <button
        type="button"
        onClick={openContact}
        className="services-reveal pointer-events-auto mt-10 rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:border-logo-red/60 hover:bg-white/10"
      >
        {t.cta}
      </button>

      <footer className="absolute inset-x-0 bottom-6 flex items-center justify-between px-6 text-[11px] uppercase tracking-[0.22em] text-silver/40 sm:px-10">
        <span className="lowercase tracking-[0.22em]">
          <span className="text-white/70">rey</span>
          <span className="text-logo-red">po</span>
        </span>
        <span>© {year}</span>
      </footer>
    </section>
  );
}
