import * as THREE from "three";
import { SHOWREEL_CLIPS } from "./siteConfig";

/**
 * Shared choreography for the "camera as projector" act.
 *
 * Picture the centre of the page as a planet ("Saturn"). The combined device
 * (camera body + lens) rides a tidally-locked orbit around it — like a moon,
 * the LENS ALWAYS FACES THE CENTRE, so the rotation is one smooth sweep with no
 * separate flips:
 *
 *  • Hero → orbit entry: the device leaves the front-centre hero pose, slides
 *    out to the RIGHT and turns to face the centre as it joins the orbit.
 *  • Video: it sweeps to DIRECTLY BEHIND the centre. There the lens (still
 *    facing the centre) points at the viewer, so it projects the showreel
 *    forward onto a centred DOM screen.
 *  • Software: it continues around the LEFT toward the FRONT. Because the lens
 *    keeps facing the centre, coming round to the front naturally turns it to
 *    face AWAY (into the screen) with the camera's BACK toward the viewer — and
 *    the projection cross-fades from the reel to the terminal screen.
 *
 * StageRig computes the device pose and beam intensity once per frame and
 * publishes them into the mutable `projection` store below; the beam, eye and
 * pupil read those values in their own frame callbacks (mounted below StageRig,
 * so they always see the current frame's values). Mirrors the scrollStore
 * pattern: plain mutable singletons keep the render loop free of re-renders.
 */

/**
 * Scroll bands (page progress 0..1). Structured as clean DWELL zones with quick
 * transitions between, so scrolling settles on a stable "video" or "software"
 * state rather than lingering in an ugly mid-orbit pose. HeroSection snaps the
 * scroll to the dwell centres (SNAP_POINTS) so you can't get stuck between.
 *
 *   hero → [enter] → VIDEO dwell → [transition] → SOFTWARE dwell → contact
 */
export const PROJ = {
  /** Hero pose → behind the centre (video pose). φ: PHI_START → 0. The camera
      moves across most of this range so the hero→video swing plays out fully. */
  enterStart: 0.06,
  enterEnd: 0.4,
  /** Behind (video) → front (software projector). φ: 0 → PHI_END. Spans most of
      the video→software range so the whole orbit swing plays, not a quick snap. */
  transStart: 0.47,
  transEnd: 0.78,
  /** Video reel fade — device behind the centre, lens toward the viewer. */
  videoIn0: 0.18,
  videoIn1: 0.34,
  videoOut0: 0.52,
  videoOut1: 0.6,
  /** Terminal projection fade — device settled as the front projector. */
  softIn0: 0.62,
  softIn1: 0.78,
  softOut0: 0.9,
  softOut1: 0.96,
  /** Device drops + shrinks into the projector pose across the transition. */
  dropStart: 0.5,
  dropEnd: 0.78,
} as const;

/**
 * The video act's dwell window. The device holds the behind-the-centre vertex
 * across all of it (φ dwells over [enterEnd, transStart] and the drop starts
 * later), so every reel sub-stop below shares the exact same stable projector
 * pose — stepping between them changes ONLY the picture on the screen.
 */
export const VIDEO_DWELL0 = 0.405;
export const VIDEO_DWELL1 = 0.465;

/** One scroll stop per showreel clip, spread across the video dwell — inside
    the act each scroll notch advances one reel instead of leaving the act. */
export const VIDEO_SNAPS: number[] =
  SHOWREEL_CLIPS.length <= 1
    ? [0.43]
    : SHOWREEL_CLIPS.map(
        (_, i) =>
          VIDEO_DWELL0 +
          ((VIDEO_DWELL1 - VIDEO_DWELL0) * i) / (SHOWREEL_CLIPS.length - 1),
      );

/** Scroll progress the experience snaps to — the clean act states:
    hero → reel 1..n → software → outro. */
export const SNAP_POINTS: number[] = [0, ...VIDEO_SNAPS, 0.81, 0.97];

/** Which reel the video act should be showing at progress p (nearest stop). */
export const clipIndexFor = (p: number) => {
  const n = SHOWREEL_CLIPS.length;
  if (n <= 1) return 0;
  const t = (p - VIDEO_DWELL0) / (VIDEO_DWELL1 - VIDEO_DWELL0);
  return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
};

/** Orbit centre — the page centre ("Saturn") that the lens always faces. */
export const ORBIT_C = new THREE.Vector3(0, 0.15, -2);
/** Orbit radii: sideways (±x) and depth (behind for video, front for software). */
export const ORBIT_RX = 5.2;
export const ORBIT_RZ = 5.5;
/** Inclined orbital plane: how much it lifts/dips on the side passes. */
export const ORBIT_TILT = 0.6;
/** Orbit entry angle (right side, level with the centre)… */
export const PHI_START = 0.5 * Math.PI;
/**
 * …and exit angle. Settles the device on the LEFT in an elegant 3/4 profile
 * (lens barrel + reels toward the viewer, aimed at the centre) — a film
 * projector angled up at the screen, rather than a flat back panel.
 */
export const PHI_END = -0.72 * Math.PI;

/**
 * The lens always points at this screen target (roughly the viewport centre in
 * world space, matching the camera's lookAt). Behind the centre it resolves to
 * "toward the viewer" (video); low on the left it resolves to "up-and-across
 * onto the screen" (software) — one tidal look-at drives both.
 */
export const SCREEN_TARGET = new THREE.Vector3(0, 0.6, 0);
/** How far the device sinks (world units) as it settles into the projector
    pose, so it reads as sitting low and throwing UP at the screen. */
export const SOFT_DROP = 1.35;
/** The device shrinks into an elegant small projector as it settles. */
export const SOFT_SCALE = 0.62;
/** The volumetric beam is shorter for the software throw (projector→screen is
    much nearer than the video throw toward the viewer). */
export const SOFT_BEAM_SCALE = 0.52;
/** Distance (world units) along the lens axis where the beam lands — the
    terminal screen is pinned there so the beam always meets it. */
export const SOFT_THROW = 5.4;

/**
 * Behind-the-centre vertex (φ=0) — where the device projects the reel forward.
 * Used to size the beam and as the reduced-motion / default deep pose.
 */
export const DEVICE_REST = new THREE.Vector3(
  ORBIT_C.x,
  ORBIT_C.y,
  ORBIT_C.z - ORBIT_RZ,
);

/**
 * Where the forward beam lands: a point past the centred DOM picture, so the
 * beam's far ellipse rings the picture like light hitting a screen. Only used
 * to size the beam length.
 */
export const BEAM_TARGET = new THREE.Vector3(0, 0.25, 4.5);

/** Beam cross-sections: circle at the lens exit → ellipse ringing the picture. */
export const BEAM_R0 = 0.9;
export const BEAM_A = 3.6;
export const BEAM_B = 2.15;
/** Local z where the beam leaves the housing (past the front glass). */
export const BEAM_START = 0.35;
export const BEAM_LEN = DEVICE_REST.distanceTo(BEAM_TARGET);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** 0 → 1 (a→b) → hold → 0 (c→d). */
export const band = (p: number, a: number, b: number, c: number, d: number) =>
  Math.min(ramp(p, a, b), 1 - ramp(p, c, d));

/** Forward beam + video-reel intensity (device behind, lens toward viewer). */
export const videoFade = (p: number) =>
  band(p, PROJ.videoIn0, PROJ.videoIn1, PROJ.videoOut0, PROJ.videoOut1);

/** Terminal projection intensity (device settled left as a projector). */
export const softwareProjectionFade = (p: number) =>
  band(p, PROJ.softIn0, PROJ.softIn1, PROJ.softOut0, PROJ.softOut1);

/** Legacy alias — the lamp/pupil flare tracks the overall projection state. */
export const projectionFade = videoFade;

/** Per-frame published state (written by StageRig, read by everyone else). */
export const projection = {
  /** 0..1 — how bright the volumetric beam is (video OR software throw). */
  fade: 0,
  /** Length/size scale of the beam (1 = long video throw, <1 = software). */
  beamScale: 1,
  /** Lens world pose the beam glues itself to. */
  lensPos: new THREE.Vector3(),
  lensQuat: new THREE.Quaternion(),
};
