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

      {/* direct contact — placed BELOW the CTA so the orbiting camera behind the
          centred text (which sits at screen centre) can't sit over it */}
      <div className="services-reveal mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-7">
        <a
          href="mailto:destek@reypo.com.tr"
          className="pointer-events-auto flex items-center gap-2.5 text-sm text-silver/85 transition-colors hover:text-white"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-logo-red/40 bg-logo-red/10 text-logo-red">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>
          destek@reypo.com.tr
        </a>
        <a
          href="tel:+905535094596"
          className="pointer-events-auto flex items-center gap-2.5 text-sm text-silver/85 transition-colors hover:text-white"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-logo-red/40 bg-logo-red/10 text-logo-red">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          +90 553 509 45 96
        </a>
      </div>

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
