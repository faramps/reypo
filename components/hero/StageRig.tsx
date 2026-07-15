"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import {
  PROJ,
  ORBIT_C,
  ORBIT_RX,
  ORBIT_RZ,
  ORBIT_TILT,
  PHI_START,
  PHI_END,
  SCREEN_TARGET,
  SOFT_DROP,
  SOFT_SCALE,
  SOFT_BEAM_SCALE,
  projection,
  videoFade,
  softwareProjectionFade,
  clipIndexFor,
} from "@/lib/projection";
import ReelCamera from "./ReelCamera";
import ProjectorBeam from "./ProjectorBeam";
import ProjectorScreen from "./ProjectorScreen";
import WorksTitle from "./WorksTitle";
import VideoWall from "./VideoWall";
import ArrowFlow from "./ArrowFlow";

type Props = {
  reducedMotion: boolean;
  highQuality: boolean;
  /** Localised headline for the works act (i18n lives on the DOM side). */
  worksTitle: string;
};

// scratch objects — allocated once, reused every frame
const vTarget = new THREE.Vector3();
const orbitPos = new THREE.Vector3();
const qRig = new THREE.Quaternion();
const qFaceUs = new THREE.Quaternion(); // identity: lens +z toward the viewer
const qTidal = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();
const qIdle = new THREE.Quaternion();
const eIdle = new THREE.Euler();
const eTidal = new THREE.Euler(0, 0, 0, "YXZ");
const HERO_POS = new THREE.Vector3(0, 0, 0);
/** The lens seat on the front of the body (ReelCamera docks it at z=0.95). */
const SEAT_LOCAL = new THREE.Vector3(0, 0, 0.95);

/**
 * Scroll-driven stage as ONE combined device (the reel camera with the lens
 * docked on its front and the terminal built into its back), riding a TIDALLY
 * LOCKED orbit around the page centre ("Saturn") — the lens always faces the
 * centre, so the whole move is one smooth sweep:
 *
 * 1. Hero — the full-size lens faces the viewer at centre stage; the body
 *    assembles around it as scrolling starts.
 * 2. Video — the device slides out to the right, joins the orbit and sweeps to
 *    directly BEHIND the centre. There the (centre-facing) lens points at the
 *    viewer, projecting the showreel forward onto the centred DOM screen.
 * 3. Software — it continues around to the FRONT. Because the lens keeps facing
 *    the centre, coming round the front turns it to face AWAY (into the screen)
 *    with the camera's BACK to the viewer, and the projection cross-fades from
 *    the reel to the terminal screen.
 *
 * The lens pose + (forward, video-only) beam intensity are published to the
 * shared `projection` store each frame for the beam, eye and pupil (all mounted
 * below, so their frames run after this).
 */
export default function StageRig({ reducedMotion, highQuality, worksTitle }: Props) {
  const rigRef = useRef<THREE.Group>(null);
  // reel-change kick: a quick dip-and-recover impulse when the scroll steps to
  // the next showreel clip, like a projectionist slamming the next reel in.
  // `last: -1` = unseeded, so restoring mid-act on load doesn't fire a kick.
  const kickRef = useRef({ last: -1, t: 9 });

  useFrame((state, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const p = reducedMotion ? 0 : scroll.progress;
    const t = state.clock.elapsedTime;

    const videoF = reducedMotion ? 0 : videoFade(p);
    const softF = reducedMotion ? 0 : softwareProjectionFade(p);
    // Idle drift dies while projecting (video OR terminal) — the picture is
    // pinned to the viewport, so the projector must hold still under it.
    const bob = reducedMotion ? 0 : 1 - Math.max(videoF, softF);
    // settle ramp: drops + shrinks the device into the low projector pose
    const settle = THREE.MathUtils.smoothstep(p, PROJ.dropStart, PROJ.dropEnd);

    // ---- orbit angle φ in two eased legs with a DWELL between:
    //   PHI_START → 0 (behind = video) … hold … 0 → PHI_END (front = software).
    // Holding φ at each end is what gives clean, stable video/software states
    // instead of a continuous sweep you can stop in the middle of.
    const toBehind = THREE.MathUtils.smoothstep(p, PROJ.enterStart, PROJ.enterEnd);
    const toFront = THREE.MathUtils.smoothstep(p, PROJ.transStart, PROJ.transEnd);
    const enter = toBehind; // hero-pose → orbit blend tracks the first leg
    let phi = THREE.MathUtils.lerp(PHI_START, 0, toBehind);
    phi = THREE.MathUtils.lerp(phi, PHI_END, toFront);
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    const drop = SOFT_DROP * settle;

    // on-orbit position around the centre (φ=0 is behind, φ=±π is front)
    orbitPos.set(
      ORBIT_C.x + ORBIT_RX * s,
      ORBIT_C.y + ORBIT_TILT * s - drop,
      ORBIT_C.z - ORBIT_RZ * c,
    );

    // ---- position: blend from the hero pose onto the orbit, then follow it.
    vTarget.lerpVectors(HERO_POS, orbitPos, enter);
    // hero→video flies a long, pronounced arc (peaks at the midpoint, zero at
    // both ends, first leg only) — out to the RIGHT (PHI_START puts the ring
    // there), up the inclined plane and a touch deeper. Kept IN the orbit plane
    // (not toward the viewer) so that, with the lens locked on the centre, we
    // see the camera in side profile as it swings around, not its face.
    const sweep = Math.sin(toBehind * Math.PI) * (1 - toFront);
    vTarget.x += ORBIT_RX * 0.8 * sweep;
    vTarget.y += ORBIT_TILT * 1.7 * sweep;
    vTarget.z -= 1.6 * sweep;

    // ---- orientation: lock the lens onto the centre from the device's ACTUAL
    // (swept) position, and turn there QUICKLY out of the hero's face-the-viewer
    // pose — so almost the whole orbit shows the camera centre-focused in
    // profile, not spinning to face the user. At the behind (video) vertex
    // "facing the centre" naturally resolves back to "facing the viewer".
    const dx = SCREEN_TARGET.x - vTarget.x;
    const dy = SCREEN_TARGET.y - vTarget.y;
    const dz = SCREEN_TARGET.z - vTarget.z;
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    eTidal.set(pitch, yaw, 0, "YXZ");
    qTidal.setFromEuler(eTidal);
    const faceLock = THREE.MathUtils.smoothstep(p, 0.05, 0.17);
    qTarget.copy(qFaceUs).slerp(qTidal, faceLock);

    // idle bob (position only) — after the aim is computed so it doesn't skew it
    vTarget.y += Math.sin(t * 0.32) * 0.06 * bob;
    // reel-change kick (video act only — the pose is otherwise frozen there)
    const kick = kickRef.current;
    const clipI = clipIndexFor(p);
    if (kick.last === -1) kick.last = clipI;
    else if (clipI !== kick.last) {
      kick.last = clipI;
      if (videoF > 0.5) kick.t = 0;
    }
    kick.t = Math.min(kick.t + delta, 9);
    // gentle: a soft single dip-and-recover, not a slam
    const kickAmp = Math.exp(-kick.t * 4) * Math.sin(kick.t * 14);
    if (Math.abs(kickAmp) > 0.001) vTarget.y -= 0.045 * kickAmp;
    // Tighter damping (higher lambda) tracks the snapped progress closely, so
    // the motion is responsive and follows the orbit path instead of lagging.
    rig.position.x = THREE.MathUtils.damp(rig.position.x, vTarget.x, 6, delta);
    rig.position.y = THREE.MathUtils.damp(rig.position.y, vTarget.y, 6, delta);
    rig.position.z = THREE.MathUtils.damp(rig.position.z, vTarget.z, 6, delta);

    // While PARKED directly behind the centre (the video dwell) the device
    // must hide completely behind the projected picture — which can be a
    // narrow portrait frame for vertical reels. It recedes/shrinks a touch
    // further as it docks (reads as sinking into the page), and grows back
    // as it swings out toward the software pose. The approach flight itself
    // (p < 0.36) is untouched — the full orbit still plays out.
    const parked =
      THREE.MathUtils.smoothstep(p, 0.36, 0.425) *
      (1 - THREE.MathUtils.smoothstep(p, PROJ.transStart, PROJ.transStart + 0.05));
    // shrink into an elegant small projector as it settles
    const scl = THREE.MathUtils.damp(
      rig.scale.x,
      THREE.MathUtils.lerp(1, SOFT_SCALE, settle) * (1 - 0.45 * parked),
      6,
      delta,
    );
    rig.scale.setScalar(scl);
    if (bob > 0.001) {
      // a whisper of idle life when not locked onto a projection
      eIdle.set(Math.sin(t * 0.45) * 0.02 * bob, 0, 0, "YXZ");
      qIdle.setFromEuler(eIdle);
      qTarget.multiply(qIdle);
    }
    if (Math.abs(kickAmp) > 0.001) {
      // the reel change also rolls the body a whisper
      eIdle.set(0, 0, 0.01 * kickAmp, "YXZ");
      qIdle.setFromEuler(eIdle);
      qTarget.multiply(qIdle);
    }
    rig.quaternion.slerp(qTarget, 1 - Math.exp(-6 * delta));

    // ---- publish the lens pose + beam intensity for beam / eye / pupil. The
    // volumetric beam now fires for BOTH throws (video toward the viewer,
    // software up-and-across to the screen); it's shorter for the software one.
    qRig.copy(rig.quaternion);
    projection.fade = Math.max(videoF, softF);
    projection.beamScale = THREE.MathUtils.lerp(1, SOFT_BEAM_SCALE, softF);
    projection.lensPos
      .copy(SEAT_LOCAL)
      .multiplyScalar(scl)
      .applyQuaternion(qRig)
      .add(rig.position);
    projection.lensQuat.copy(qRig);
  });

  return (
    <>
      <group ref={rigRef}>
        <ReelCamera reducedMotion={reducedMotion} highQuality={highQuality} />
      </group>

      {/* Reduced motion pins the device to its hero pose (p is forced to 0),
          so the projector act can never appear — skip mounting the act layers. */}
      {!reducedMotion && (
        <>
          <ProjectorBeam highQuality={highQuality} />
          <ProjectorScreen highQuality={highQuality} />
          <WorksTitle text={worksTitle} />
          <VideoWall />
          <ArrowFlow highQuality={highQuality} />
        </>
      )}
    </>
  );
}
