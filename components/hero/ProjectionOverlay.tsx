"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { scroll } from "@/lib/scrollStore";
import { videoFade, clipIndexFor } from "@/lib/projection";
import { SHOWREEL_CLIPS } from "@/lib/siteConfig";
import { Placeholder } from "./Showreel";

const clips = SHOWREEL_CLIPS;
const hasVideo = clips.length > 0 && clips[0].src !== "";
const multi = clips.length > 1;

/** Crossfade length between reels (covers the CSS transition on the slots). */
const XFADE_S = 0.75;

/** Fixed screen height — the classic 16:9 frame's height (58vw wide capped at
    1080px). The WIDTH follows each clip's aspect ratio around this height. */
const SCREEN_H = "min(32.625vw, 607.5px)";
/** Frame width for an aspect ratio (capped so ultra-wide can't overflow). */
const screenWidth = (a: number) =>
  `min(calc(${SCREEN_H} * ${a.toFixed(4)}), 92vw)`;

const pad = (n: number) => String(n).padStart(2, "0");

type Deck = {
  /** Which of the two <video> slots is currently the visible reel. */
  front: 0 | 1;
  /** Reel index the front slot is showing. */
  index: number;
  /** Reel index an in-flight switch is heading to. */
  target: number;
  phase: "idle" | "loading" | "fading";
  /** Seconds spent in the current phase (watchdog for stalled loads). */
  phaseT: number;
  fadeT: number;
  /** Consecutive load watchdog trips — 2 in a row hard-reloads the slot. */
  stalls: number;
  shownLabel: number;
};

/** A switch stuck loading this long is aborted (and retried) — the current
    reel keeps playing instead of the screen sitting in limbo. */
const LOAD_TIMEOUT_S = 2.5;

/**
 * The VIDEO screen — the centred DOM surface the lens throws the showreel onto
 * while the device is BEHIND the page centre (its lens points at the viewer, so
 * the reel reads as thrown onto the viewer's own display). It sits between the
 * canvas (z-0) and the text panels (z-10).
 *
 * The reel on screen is DRIVEN BY SCROLL: each clip in SHOWREEL_CLIPS is its
 * own scroll stop inside the act (see VIDEO_SNAPS), so a scroll notch advances
 * to the next reel — the reels play strictly one at a time, in order. Two
 * stacked <video> slots crossfade between reels like a projectionist swapping
 * reels: the incoming clip decodes ONE frame in the hidden slot, dissolves in
 * as a freeze-frame, and starts rolling exactly when the outgoing reel stops
 * (single-decoder handoff — two heavy videos never decode simultaneously).
 * Every reel starts from its top (on switch AND on re-entering the act) and
 * loops while it is on. Decoders only run while the act is near.
 *
 * The SOFTWARE screen is NOT here — it's a real 3D plane in the scene
 * (ProjectorScreen), pinned perpendicular to the beam so the throw is
 * physically correct. Never mounted under reduced motion (HeroSection's
 * fallback shows the plain Showreel panel instead).
 */
export default function ProjectionOverlay() {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const vidRefs = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelRef = useRef<HTMLSpanElement>(null);
  // sound: the reels play WITH audio. Browsers refuse un-muted autoplay until
  // the user has interacted once — then the first pointer/key unmutes it.
  const soundOnRef = useRef(true); // user intent (the toggle button)
  const soundBlockedRef = useRef(false); // autoplay denied, awaiting a gesture
  const [soundUI, setSoundUI] = useState(true);
  const deckRef = useRef<Deck>({
    front: 0,
    index: 0,
    target: 0,
    phase: "idle",
    phaseT: 0,
    fadeT: 0,
    stalls: 0,
    shownLabel: -1,
  });

  // reel-deck state machine, run per frame (no React re-renders)
  useEffect(() => {
    if (!hasVideo) return;
    const vids = vidRefs.current; // stable array instance, captured for cleanup
    let raf = 0;
    let last = performance.now();

    /**
     * Reconcile a slot against the element's REAL paused state every frame,
     * never an intent flag: a play() promise can be silently rejected by a
     * competing pause()/seek/load, and a flag would then lie forever with the
     * reel frozen. Re-issuing play() on a paused-but-should-play element makes
     * any such desync heal within a frame.
     */
    // per-slot pending play() timestamp (0 = none). A play() on a heavy file
    // can hang for seconds while data/decoder spin up — if it exceeds the
    // limit we hard-reload the slot, which aborts the wedged request, and the
    // per-frame reconcile below immediately issues a fresh one.
    const pendingSince: [number, number] = [0, 0];
    const PLAY_WEDGE_MS = 3000;
    const setPlay = (slot: 0 | 1, on: boolean) => {
      const v = vidRefs.current[slot];
      if (!v || on === !v.paused) return; // already in the requested state
      if (on) {
        if (pendingSince[slot]) {
          if (performance.now() - pendingSince[slot] > PLAY_WEDGE_MS) {
            pendingSince[slot] = 0;
            v.load(); // aborts the wedged play(); retried next frame from 0
          }
          return;
        }
        pendingSince[slot] = performance.now();
        // play with sound when the user wants it and the browser allows it;
        // before the first user gesture autoplay must start muted
        v.muted = !soundOnRef.current || soundBlockedRef.current;
        v.play()
          .catch(() => {
            if (!v.muted) {
              // un-muted autoplay refused (no gesture yet): start muted — the
              // next pointer/key anywhere (or the sound button) unmutes it
              soundBlockedRef.current = true;
              setSoundUI(false);
              v.muted = true;
              v.play().catch(() => {});
            }
          })
          .finally(() => {
            pendingSince[slot] = 0;
          });
      } else {
        v.pause();
      }
    };

    // first user gesture lifts the autoplay block on the playing reel
    const unlockSound = () => {
      if (!soundBlockedRef.current || !soundOnRef.current) return;
      soundBlockedRef.current = false;
      const front = vidRefs.current[deckRef.current.front];
      if (front && !front.paused) {
        front.muted = false;
        front.volume = 1;
      }
      setSoundUI(true);
    };
    window.addEventListener("pointerdown", unlockSound);
    window.addEventListener("keydown", unlockSound);

    /** Point a slot at a reel — every reel always starts from its top. */
    const assign = (slot: 0 | 1, clipIdx: number) => {
      const v = vidRefs.current[slot];
      if (!v) return;
      const src = clips[clipIdx]?.src ?? "";
      // fetch + decode the first frame WITHOUT playing — the incoming reel
      // dissolves in as a freeze-frame and only starts rolling at handoff
      v.preload = "auto";
      if (v.dataset.src !== src) {
        v.dataset.src = src;
        v.src = src;
        v.load();
      } else if (v.readyState >= 1 && v.currentTime > 0.05) {
        // rewind — skipped when already at the top, so rapid up/down never
        // piles up redundant seeks (each one wedges the element briefly)
        try {
          v.currentTime = 0;
        } catch {
          /* not seekable yet */
        }
      }
    };

    /** Reshape the frame to a clip's aspect; morphs while the act is visible. */
    let curAspect = 16 / 9;
    const setAspect = (a: number, animate: boolean) => {
      const el = screenRef.current;
      if (!el || !(a > 0.1) || Math.abs(a - curAspect) < 0.01) return;
      curAspect = a;
      el.style.transition = animate
        ? "width 650ms cubic-bezier(0.4, 0, 0.2, 1)"
        : "none";
      el.style.width = screenWidth(a);
    };

    let wasActive = false;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const deck = deckRef.current;
      deck.phaseT += dt;
      const p = scroll.progress;
      const vOp = videoFade(p);

      const root = rootRef.current;
      if (root) {
        root.style.opacity = String(vOp);
        root.style.visibility = vOp < 0.02 ? "hidden" : "visible";
      }

      const active = vOp > 0.05;
      const want = clipIndexFor(p);
      const frontV = vidRefs.current[deck.front];
      const backSlot = (1 - deck.front) as 0 | 1;
      const backV = vidRefs.current[backSlot];

      // leaving the act rewinds the reel, so every return starts from the top
      if (
        wasActive &&
        !active &&
        frontV &&
        frontV.readyState >= 1 &&
        frontV.currentTime > 0.05
      ) {
        try {
          frontV.currentTime = 0;
        } catch {
          /* not seekable */
        }
      }
      wasActive = active;

      if (!active && (want !== deck.index || deck.phase !== "idle")) {
        // act is off screen: abort any in-flight switch and hard-cut the front
        // slot to the wanted reel — no point crossfading in the dark
        deck.phase = "idle";
        deck.phaseT = 0;
        deck.index = want;
        deck.target = want;
        assign(deck.front, want);
        if (frontV) frontV.volume = 1;
        if (backV) backV.style.opacity = "0";
      } else if (active && deck.phase === "fading" && want === deck.index) {
        // direction reversed mid-dissolve, back to the reel we're leaving:
        // cancel the blend on the spot instead of finishing it and dissolving
        // again — rapid up/down stays snappy and can never wedge mid-switch
        if (frontV) {
          frontV.style.opacity = "1";
          frontV.volume = 1;
        }
        if (backV) backV.style.opacity = "0";
        setPlay(backSlot, false);
        deck.target = deck.index;
        deck.phase = "idle";
        deck.phaseT = 0;
      } else if (active && want !== deck.target && deck.phase !== "fading") {
        // begin (or retarget) a reel change: decode its first frame in the
        // hidden slot — it does NOT play yet (single-decoder rule: the
        // outgoing reel keeps the only running decoder until handoff)
        deck.target = want;
        deck.phase = "loading";
        deck.phaseT = 0;
        assign(backSlot, want);
        if (backV) backV.volume = 0;
      }

      if (deck.phase === "loading") {
        if (backV && backV.readyState >= 2 && !backV.seeking) {
          // the incoming reel has frames — dissolve to it (the slots' CSS
          // opacity transition does the blend)
          deck.phase = "fading";
          deck.phaseT = 0;
          deck.fadeT = 0;
          deck.stalls = 0;
          backV.style.opacity = "1";
          if (frontV) frontV.style.opacity = "0";
          // the frame morphs to the incoming clip's shape with the dissolve
          setAspect(backV.videoWidth / Math.max(1, backV.videoHeight), true);
        } else if (deck.phaseT > LOAD_TIMEOUT_S) {
          // stalled fetch/seek: abort — the current reel keeps playing (never
          // a black screen); if the scroll still wants the other reel, the
          // switch re-initiates fresh on the next frame. Two trips in a row
          // means the slot itself is wedged (e.g. its decoder was reclaimed
          // during a long session) — hard-reload the element to resurrect it.
          deck.stalls++;
          if (backV && deck.stalls >= 2) {
            deck.stalls = 0;
            backV.load();
          }
          deck.phase = "idle";
          deck.phaseT = 0;
          deck.target = deck.index;
          setPlay(backSlot, false);
        }
      } else if (deck.phase === "fading") {
        deck.fadeT += dt;
        const k = Math.min(1, deck.fadeT / XFADE_S);
        // audio hands off with the picture: outgoing rides to silence exactly
        // at the handoff point, incoming fades in right after it starts
        if (frontV) frontV.volume = Math.max(0, 1 - k / 0.65);
        if (backV) backV.volume = Math.min(1, Math.max(0, (k - 0.6) / 0.4));
        // HANDOFF (~2/3 in, outgoing barely visible): stop the old reel and
        // start the new one — at no point do two decoders run at once, which
        // keeps the dissolve smooth even with heavy 4K files
        if (deck.fadeT >= XFADE_S * 0.65) {
          setPlay(deck.front, false);
          setPlay(backSlot, true);
        }
        if (deck.fadeT >= XFADE_S) {
          const backAlive = backV && (!backV.paused || backV.readyState >= 2);
          if (!backAlive) {
            // the incoming reel lost its frames mid-fade (wedged decoder was
            // reloaded) — revert to the old reel instead of flipping to a
            // black screen; the switch re-initiates fresh if still wanted
            if (frontV) {
              frontV.style.opacity = "1";
              frontV.volume = 1;
            }
            if (backV) backV.style.opacity = "0";
            setPlay(backSlot, false);
            deck.target = deck.index;
          } else {
            setPlay(deck.front, false);
            setPlay(backSlot, true);
            if (frontV) {
              frontV.volume = 1; // reset for its next turn
              frontV.style.opacity = "0"; // retired reel must never cover
            }
            if (backV) {
              backV.volume = 1;
              backV.style.opacity = "1";
            }
            deck.front = backSlot;
            deck.index = deck.target;
          }
          deck.phase = "idle";
          deck.phaseT = 0;
        }
      }

      // NOTE: deck.front may have just flipped above — re-read the CURRENT
      // front here. (Using the stale pre-flip reference resurrected the
      // retired reel's opacity right after every switch, leaving its frozen
      // frame stacked over the live one.)
      const curFront = vidRefs.current[deck.front];
      // first frames of the (settled) front reel fade in over the placeholder
      if (
        deck.phase !== "fading" &&
        curFront &&
        curFront.readyState >= 2 &&
        curFront.style.opacity !== "1"
      ) {
        curFront.style.opacity = "1";
      }
      // the frame also tracks the settled reel's shape (initial load, hard
      // cuts, cancelled switches) — snapping instantly while off screen
      if (deck.phase === "idle" && curFront && curFront.readyState >= 2) {
        setAspect(
          curFront.videoWidth / Math.max(1, curFront.videoHeight),
          active,
        );
      }

      // decoders only spin while the act is near; past the mid-fade handoff
      // the OUTGOING reel must stay stopped (the incoming one has the decoder)
      const handedOff =
        deck.phase === "fading" && deck.fadeT >= XFADE_S * 0.65;
      setPlay(deck.front, active && !handedOff);
      if (deck.phase === "idle") setPlay((1 - deck.front) as 0 | 1, false);

      // reel counter: shows the incoming reel as soon as the switch starts
      const shown = deck.phase === "idle" ? deck.index : deck.target;
      if (multi && shown !== deck.shownLabel) {
        deck.shownLabel = shown;
        if (labelRef.current) {
          labelRef.current.textContent = `REEL ${pad(shown + 1)}/${pad(clips.length)}`;
        }
        tickRefs.current.forEach((el, i) => {
          if (el) el.dataset.active = i === shown ? "1" : "0";
        });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
      vids.forEach((v) => v?.pause());
    };
  }, []);

  // sound button: silent (muted OR autoplay-blocked) → the click itself is the
  // missing gesture, so it can always turn sound on; audible → mutes
  const toggleSound = () => {
    const front = vidRefs.current[deckRef.current.front];
    const silent = !soundOnRef.current || soundBlockedRef.current;
    if (silent) {
      soundOnRef.current = true;
      soundBlockedRef.current = false;
      if (front) {
        front.muted = false;
        front.volume = 1;
      }
      setSoundUI(true);
    } else {
      soundOnRef.current = false;
      if (front) front.muted = true;
      setSoundUI(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className="pointer-events-none invisible fixed inset-0 z-[5] opacity-0"
      aria-hidden
    >
      {/* light spill washing over the whole viewport */}
      <div className="absolute inset-0 bg-[radial-gradient(85%_80%_at_50%_46%,rgba(186,208,255,0.12),transparent_72%)]" />

      {/* VIDEO screen — big, centred (device projects it from behind the page).
          Height is FIXED; the width follows the active clip's aspect, so a
          vertical reel reshapes the screen into a portrait frame, morphing in
          sync with the reel dissolve. */}
      <div
        ref={screenRef}
        className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-[0_0_140px_rgba(150,180,255,0.2)] [mask-image:radial-gradient(118%_118%_at_50%_50%,black_55%,transparent_97%)]"
        style={{ height: SCREEN_H, width: screenWidth(16 / 9) }}
      >
        <Placeholder label={t.showreel.label} />
        {hasVideo &&
          ([0, 1] as const).map((slot) => (
            <video
              key={slot}
              ref={(el) => {
                vidRefs.current[slot] = el;
              }}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-in-out"
              src={slot === 0 ? clips[0].src : undefined}
              data-src={slot === 0 ? clips[0].src : undefined}
              poster={slot === 0 ? clips[0].poster : undefined}
              muted
              loop
              playsInline
              preload="none"
              onError={(e) => {
                e.currentTarget.style.opacity = "0";
              }}
            />
          ))}
        {/* rear-projection hot spot: the lamp burns through the centre */}
        <div className="absolute inset-0 bg-[radial-gradient(24%_32%_at_50%_50%,rgba(215,230,255,0.13),transparent_100%)]" />
      </div>

      {/* reel counter + sound toggle — just under the screen */}
      {hasVideo && (
        <div className="absolute left-1/2 top-[calc(46%_+_min(16.4vw,306px)_+_20px)] flex -translate-x-1/2 items-center gap-4 font-mono text-[10px] tracking-[0.3em] text-silver/60">
          {multi && (
            <>
              <div className="flex items-center gap-1.5">
                {clips.map((_, i) => (
                  <span
                    key={i}
                    ref={(el) => {
                      tickRefs.current[i] = el;
                    }}
                    data-active={i === 0 ? "1" : "0"}
                    className="h-[3px] w-6 rounded-full bg-white/15 transition-all duration-300 data-[active=1]:bg-logo-red"
                  />
                ))}
              </div>
              <span ref={labelRef}>REEL 01/{pad(clips.length)}</span>
            </>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={toggleSound}
            className="pointer-events-auto rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-[0.25em] text-silver/70 backdrop-blur-sm transition-colors hover:text-white"
          >
            {soundUI ? t.soundOn : t.soundOff}
          </button>
        </div>
      )}
    </div>
  );
}
