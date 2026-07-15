"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { scroll } from "@/lib/scrollStore";
import { SHOWREEL_SRC, SHOWREEL_POSTER } from "@/lib/siteConfig";

/** Film-strip frame shown before the video is ready, or when no file exists.
    Exported for ProjectionOverlay, which projects the same reel fullscreen. */
export function Placeholder({ label }: { label: string }) {
  const holes = Array.from({ length: 12 });
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1020] to-[#06080e]" />
      <div className="absolute inset-x-0 top-0 flex justify-around px-2 py-1.5">
        {holes.map((_, i) => (
          <span key={i} className="h-2 w-3 rounded-[2px] bg-white/[0.07]" />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-around px-2 py-1.5">
        {holes.map((_, i) => (
          <span key={i} className="h-2 w-3 rounded-[2px] bg-white/[0.07]" />
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" className="translate-x-px text-white/75">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </div>
      </div>
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.3em] text-white/30">
        {label}
      </span>
    </div>
  );
}

/**
 * Showreel player for the creative/video act. The clip is loaded lazily — it
 * only fetches and plays once the scroll reaches this act (and pauses when it
 * leaves), so it never costs anything during the hero. It is a silent, looping
 * background reel (always muted, no sound controls). Under reduced motion it
 * stays a static film-strip frame. When no file exists yet (or it fails to
 * load) the same film-strip placeholder is shown, so the panel always reads as
 * intentional.
 */
export default function Showreel({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const hasVideo = SHOWREEL_SRC !== "" && !failed && !reducedMotion;
  const poster = SHOWREEL_POSTER || undefined;

  // Activate only while the video act is on screen (matches the panel's
  // crossfade band in HeroSection), with hysteresis so it doesn't thrash.
  useEffect(() => {
    if (!hasVideo) return;
    let raf = 0;
    let cur = false;
    const loop = () => {
      const p = scroll.progress;
      const next = cur ? p > 0.06 && p < 0.72 : p > 0.1 && p < 0.68;
      if (next !== cur) {
        cur = next;
        setActive(next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hasVideo]);

  // Lazy play/pause (preload="none" means nothing is fetched until play()).
  // Force muted before playing so autoplay is always allowed.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  return (
    <div className={className}>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.12] bg-[#06080e] shadow-2xl shadow-black/50">
        <Placeholder label={t.showreel.label} />

        {hasVideo && (
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
            src={SHOWREEL_SRC}
            poster={poster}
            muted
            loop
            playsInline
            preload="none"
            onCanPlay={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}

        {/* SHOWREEL label */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-white/80">
          <span className="hud-rec inline-block h-1.5 w-1.5 rounded-full bg-logo-red" />
          {t.showreel.label}
        </div>
      </div>
    </div>
  );
}
