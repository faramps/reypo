"use client";

import { useEffect, useRef } from "react";
import { scroll } from "@/lib/scrollStore";

const CHAPTERS = ["VISION", "VIDEO", "SOFTWARE", "CONTACT"];

function chapterIndex(p: number) {
  if (p < 0.1) return 0;
  if (p < 0.6) return 1;
  if (p < 0.9) return 2;
  return 3;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Cinematic viewfinder overlay that frames the whole experience as "looking
 * through reypo's camera": corner crop brackets, a blinking REC dot with a live
 * running timecode, lens readouts, a centre focus reticle and a chapter readout
 * driven by scroll progress. Pure DOM, updated via rAF (no React re-renders).
 */
export default function ViewfinderHUD() {
  const tcRef = useRef<HTMLSpanElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const t = (performance.now() - start) / 1000;
      if (tcRef.current) {
        const ff = Math.floor((t * 24) % 24);
        const ss = Math.floor(t % 60);
        const mm = Math.floor(t / 60) % 60;
        const hh = Math.floor(t / 3600) % 100;
        tcRef.current.textContent = `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
      }
      const idx = chapterIndex(scroll.progress);
      dotRefs.current.forEach((d, i) => {
        if (d) d.dataset.active = i === idx ? "1" : "0";
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* corner crop brackets */}
      <div className="absolute left-5 top-5 h-7 w-7 border-l border-t border-white/30" />
      <div className="absolute right-5 top-5 h-7 w-7 border-r border-t border-white/30" />
      <div className="absolute bottom-5 left-5 h-7 w-7 border-b border-l border-white/30" />
      <div className="absolute bottom-5 right-5 h-7 w-7 border-b border-r border-white/30" />

      {/* REC + timecode */}
      <div className="absolute left-5 top-16 flex items-center gap-2 font-mono text-[11px] tracking-widest text-silver/70">
        <span className="hud-rec inline-block h-2 w-2 rounded-full bg-logo-red" />
        <span className="text-logo-red">REC</span>
        <span ref={tcRef}>00:00:00:00</span>
      </div>

      {/* lens readout (hidden on mobile to avoid crowding the top bar) */}
      <div className="absolute right-5 top-16 hidden text-right font-mono text-[11px] tracking-widest text-silver/50 sm:block">
        f/1.4 · 1/48 · ISO 800
      </div>

      {/* centre focus reticle */}
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 opacity-30">
        <div className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-white" />
        <div className="absolute bottom-0 left-1/2 h-3 w-px -translate-x-1/2 bg-white" />
        <div className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-white" />
        <div className="absolute right-0 top-1/2 h-px w-3 -translate-y-1/2 bg-white" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-logo-red" />
      </div>

      {/* chapter readout (right edge) — hidden on mobile so it can't collide
          with the right-aligned panel text / showreel */}
      <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 sm:flex">
        {CHAPTERS.map((c, i) => (
          <div
            key={c}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            data-active="0"
            className="group flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-silver/30 transition-colors data-[active=1]:text-white"
          >
            <span className="group-data-[active=1]:text-logo-red">{c}</span>
            <span className="h-px w-4 bg-current opacity-50 transition-all group-data-[active=1]:w-7 group-data-[active=1]:opacity-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
