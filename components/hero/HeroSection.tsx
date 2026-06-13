"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LanguageProvider } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { scroll } from "@/lib/scrollStore";
import HeroOverlay from "./HeroOverlay";
import VideoPanel from "./VideoPanel";
import SoftwarePanel from "./SoftwarePanel";
import OutroSection from "./OutroSection";
import TopBar from "./TopBar";
import ViewfinderHUD from "./ViewfinderHUD";

/**
 * The R3F canvas must be client-only: Three.js needs `window`, so it is loaded
 * with ssr:false. Per the Next.js docs, `ssr:false` is only allowed inside a
 * Client Component — which is why this wrapper carries the 'use client' directive.
 */
const SceneCanvas = dynamic(() => import("./SceneCanvas"), {
  ssr: false,
  loading: () => <SceneLoader />,
});

function SceneLoader() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <span className="aperture-spinner" aria-hidden />
        <span className="text-sm font-medium uppercase tracking-[0.4em] text-silver/60">
          reypo
        </span>
      </div>
    </div>
  );
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 0 below `a`, ramps to 1 at `b`. */
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** 0 → 1 (a→b) → hold → 0 (c→d). */
const band = (p: number, a: number, b: number, c: number, d: number) =>
  Math.min(ramp(p, a, b), 1 - ramp(p, c, d));

function setPanel(el: HTMLElement | null, op: number) {
  if (!el) return;
  el.style.opacity = String(op);
  el.style.visibility = op < 0.02 ? "hidden" : "visible";
}

/**
 * Full scrollytelling experience. A fixed 3D canvas holds a turntable rig; the
 * page scroll only drives rotation + crossfades fixed DOM panels, so it reads as
 * "the lens rotating" rather than a scrolling page. A tall spacer supplies the
 * scroll length. Reduced motion falls back to plain stacked sections.
 */
export default function HeroSection() {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const softRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      scroll.progress = 0;
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const update = (p: number) => {
      scroll.progress = p;
      setPanel(heroRef.current, 1 - ramp(p, 0.02, 0.12));
      setPanel(videoRef.current, band(p, 0.1, 0.22, 0.58, 0.68));
      setPanel(softRef.current, band(p, 0.62, 0.72, 0.86, 0.93));
      setPanel(outroRef.current, ramp(p, 0.93, 0.98));
    };

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: rootRef.current!,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => update(self.progress),
      });
      update(st.progress);
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  if (reducedMotion) {
    // accessible fallback: static scene + plainly stacked sections
    return (
      <LanguageProvider defaultLang="tr">
        <div className="fixed inset-0 z-0">
          <SceneCanvas />
        </div>
        <ViewfinderHUD />
        <TopBar />
        <main className="pointer-events-none relative z-10">
          <HeroOverlay />
          <VideoPanel />
          <SoftwarePanel />
          <OutroSection />
        </main>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider defaultLang="tr">
      <div ref={rootRef}>
        {/* fixed cinematic 3D stage */}
        <div className="fixed inset-0 z-0">
          <SceneCanvas />
        </div>

        {/* persistent viewfinder HUD + top bar */}
        <ViewfinderHUD />
        <TopBar />

        {/* fixed crossfading panels (driven by scroll progress) */}
        <div ref={heroRef} className="pointer-events-none fixed inset-0 z-10">
          <HeroOverlay />
        </div>
        <div
          ref={videoRef}
          className="pointer-events-none invisible fixed inset-0 z-10 opacity-0"
        >
          <VideoPanel />
        </div>
        <div
          ref={softRef}
          className="pointer-events-none invisible fixed inset-0 z-10 opacity-0"
        >
          <SoftwarePanel />
        </div>
        <div
          ref={outroRef}
          className="pointer-events-none invisible fixed inset-0 z-10 opacity-0"
        >
          <OutroSection />
        </div>

        {/* scroll length driver — kept invisible; the fixed panels do the work */}
        <div className="h-[460vh]" aria-hidden />
      </div>
    </LanguageProvider>
  );
}
