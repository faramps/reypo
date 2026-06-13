"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useLanguage } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/useMediaQuery";

export default function HeroOverlay() {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>(".hero-reveal");
      if (reducedMotion) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }
      gsap.set(targets, { opacity: 0, y: 26 });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.4,
      });
    }, rootRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={rootRef}
      className="pointer-events-none relative flex min-h-[100svh] flex-col justify-between p-6 sm:p-10"
    >
      {/* top spacer — logo + language toggle live in the persistent TopBar */}
      <div aria-hidden />

      {/* Headline cluster */}
      <div className="max-w-2xl">
        <p className="hero-reveal mb-4 text-xs font-medium uppercase tracking-[0.32em] text-silver/60">
          {t.kicker}
        </p>
        <h1 className="hero-reveal text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-7xl">
          {t.headlineLead}{" "}
          <span className="text-glow">{t.headlineHighlight}</span>{" "}
          {t.headlineTail}
        </h1>
        <p className="hero-reveal mt-6 max-w-md text-base leading-7 text-silver/70 sm:text-lg">
          {t.sub}
        </p>
        <div className="hero-reveal mt-8">
          <button
            type="button"
            className="pointer-events-auto rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:border-logo-red/60 hover:bg-white/10"
          >
            {t.cta}
          </button>
        </div>
      </div>

      {/* Bottom: services + scroll hint */}
      <footer className="flex items-end justify-between gap-6">
        <ul className="hero-reveal flex flex-wrap gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.22em] text-silver/50">
          {t.services.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="inline-block h-1 w-1 rounded-full bg-logo-blue" />
              {s}
            </li>
          ))}
        </ul>
        <div className="hero-reveal flex shrink-0 items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-silver/50">
          <span className="scroll-hint inline-block h-6 w-px bg-gradient-to-b from-logo-red to-transparent" />
          {t.scrollHint}
        </div>
      </footer>
    </section>
  );
}
