"use client";

import { useLanguage } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/useMediaQuery";
import Showreel from "./Showreel";

export default function VideoPanel() {
  const { t } = useLanguage();
  // In the animated experience the showreel plays on the 3D cinema screen the
  // lens projects onto — this panel only narrates. The DOM player remains for
  // the reduced-motion fallback, where the 3D projector never runs.
  const reducedMotion = useReducedMotion();
  return (
    <div className="pointer-events-none flex min-h-[100svh] w-full flex-col items-start justify-end gap-6 p-6 sm:gap-8 sm:p-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-md">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-logo-red/80">
          {t.videoKicker}
        </p>
        <h2 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
          {t.videoHeading}
        </h2>
        <p className="mt-5 text-base leading-7 text-silver/75">{t.videoBody}</p>
        <ul className="mt-7 flex flex-wrap gap-2">
          {t.videoTags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-logo-red/30 bg-logo-red/5 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-logo-red/90"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>

      {reducedMotion && (
        <Showreel className="w-full max-w-xs md:max-w-md lg:max-w-lg" />
      )}
    </div>
  );
}
