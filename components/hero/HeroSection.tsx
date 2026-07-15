"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LanguageProvider } from "@/lib/i18n";
import { ContactProvider } from "@/lib/contact";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { scroll } from "@/lib/scrollStore";
import { SNAP_POINTS } from "@/lib/projection";
import HeroOverlay from "./HeroOverlay";
import VideoPanel from "./VideoPanel";
import SoftwarePanel from "./SoftwarePanel";
import OutroSection from "./OutroSection";
import ProjectionOverlay from "./ProjectionOverlay";
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
 * Full scrollytelling experience. A fixed 3D canvas holds the stage; the page
 * scroll flies the combined camera+lens device along a rightward orbit, turns
 * it toward the viewer to project the showreel onto the viewport itself, then
 * brings it home as it rotates to the terminal — while fixed DOM panels
 * crossfade on top, so it reads as one continuous shot rather than a scrolling
 * page. A tall spacer supplies the scroll length. Reduced motion falls back to
 * plain stacked sections.
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
      // panels align with the dwell zones (see PROJ): hero → video → software → outro
      setPanel(heroRef.current, 1 - ramp(p, 0.02, 0.12));
      setPanel(videoRef.current, band(p, 0.08, 0.22, 0.52, 0.6));
      setPanel(softRef.current, band(p, 0.62, 0.76, 0.88, 0.94));
      setPanel(outroRef.current, ramp(p, 0.92, 0.97));
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

    // ---- Layered section navigation. Rather than free-scrolling and snapping
    // when it settles (which feels laggy — it waits for the scroll to stop), we
    // hijack the input: any wheel notch / swipe / arrow IMMEDIATELY commits to
    // the next (or previous) act and animates its full camera move there. A
    // small scroll is enough; you never land in a mid-transition pose.
    const maxScroll = () =>
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const nearestIndex = () => {
      const p = window.scrollY / maxScroll();
      let best = 0;
      let bd = Infinity;
      SNAP_POINTS.forEach((sp, i) => {
        const d = Math.abs(sp - p);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    };

    const proxy = { top: window.scrollY };
    let index = nearestIndex();
    let animating = false;
    let navTween: gsap.core.Tween | undefined;

    const goTo = (i: number) => {
      i = Math.max(0, Math.min(SNAP_POINTS.length - 1, i));
      if (i === index || animating) return;
      // longer for bigger jumps, so the sweeping hero→video orbit plays out —
      // but it's the START latency that matters, so keep the fast ease-OUT.
      const from = window.scrollY / maxScroll();
      const dist = Math.abs(SNAP_POINTS[i] - from);
      const duration = Math.min(2.1, Math.max(0.7, dist * 4.4));
      index = i;
      animating = true;
      proxy.top = window.scrollY;
      navTween = gsap.to(proxy, {
        top: SNAP_POINTS[i] * maxScroll(),
        duration,
        // ease-OUT: the camera leaps the instant you scroll, then decelerates
        // into the act — no slow ease-in "dead zone".
        ease: "power2.out",
        onUpdate: () => window.scrollTo(0, proxy.top),
        onComplete: () => gsap.delayedCall(0.04, () => (animating = false)),
      });
    };

    // pause section hijacking while a dialog (e.g. the contact modal) is open,
    // so it can scroll its own content normally
    const navBlocked = () => !!document.querySelector('[role="dialog"]');

    const onWheel = (e: WheelEvent) => {
      if (navBlocked()) return;
      e.preventDefault();
      if (animating || Math.abs(e.deltaY) < 2) return;
      index = nearestIndex(); // resync (e.g. after a scrollbar drag)
      goTo(index + (e.deltaY > 0 ? 1 : -1));
    };
    const onKey = (e: KeyboardEvent) => {
      if (navBlocked()) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(index - 1);
      }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!navBlocked()) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (navBlocked()) return;
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (!animating && Math.abs(dy) > 40) {
        index = nearestIndex();
        goTo(index + (dy > 0 ? 1 : -1));
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      navTween?.kill();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      ctx.revert();
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    // accessible fallback: static scene + plainly stacked sections
    return (
      <LanguageProvider defaultLang="tr">
        <ContactProvider>
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
        </ContactProvider>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider defaultLang="tr">
      <ContactProvider>
      <div ref={rootRef}>
        {/* fixed cinematic 3D stage */}
        <div className="fixed inset-0 z-0">
          <SceneCanvas />
        </div>

        {/* persistent viewfinder HUD + top bar */}
        <ViewfinderHUD />
        <TopBar />

        {/* the showreel the lens projects onto the viewer's screen (z-[5]:
            above the canvas, below the text panels) */}
        <ProjectionOverlay />

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
      </ContactProvider>
    </LanguageProvider>
  );
}
