"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import {
  projection,
  softwareProjectionFade,
  SOFT_THROW,
} from "@/lib/projection";
import { createGlowTexture } from "./glowTexture";

const SCREEN_W = 6.4;
const SCREEN_H = SCREEN_W * (9 / 16);

/**
 * Renders a premium "software & systems" dashboard to a high-res canvas so it
 * stays crisp mapped onto the 3D screen. A projected image is the brightest
 * thing in a dark room — luminous, so it reads as the focal point and catches
 * the bloom. Split layout: a code/log editor on the left, a live systems panel
 * (status rows + an activity chart) on the right.
 */
function createTerminalTexture(): THREE.CanvasTexture {
  const W = 1536;
  const H = 864;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const RED = "#ff6b72";
  const GRN = "#5ce6a1";
  const BLU = "#8ab4ff";
  const DIM = "#8ea0bd";
  const FG = "#e9edf6";

  // luminous panel: deep blue body + a soft top-lit glow
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#131c31");
  bg.addColorStop(1, "#0a1120");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.42, H * 0.3, 0, W * 0.42, H * 0.3, W * 0.62);
  glow.addColorStop(0, "rgba(130,170,255,0.22)");
  glow.addColorStop(1, "rgba(130,170,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // title bar
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 0, W, 66);
  ctx.fillStyle = "rgba(150,170,210,0.22)";
  ctx.fillRect(0, 65, W, 1.5);
  ["#ff5d64", "#f4c150", "#4fd88a"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(42 + i * 30, 33, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.font = "600 24px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "rgba(210,220,240,0.6)";
  ctx.fillText("reypo — systems — ~/pipeline", 160, 42);
  ctx.fillStyle = GRN;
  ctx.fillText("● live", W - 128, 42);

  // ---- left: code / log
  const split = Math.round(W * 0.63);
  ctx.font = "600 29px ui-monospace, Menlo, monospace";
  const lines: [string, string][] = [
    ["$ reypo deploy --prod", DIM],
    ["› building pipeline …", BLU],
    ["  ✓ shaders compiled", GRN],
    ["  ✓ constellation.link()", GRN],
    ["  ✓ agent.stream()", GRN],
    ["POST /api/vision 200", DIM],
    ["model = load('core')", RED],
    ["pipeline.run(lens)", FG],
    ["stream = generate()", FG],
  ];
  let y = 132;
  lines.forEach(([text, color], i) => {
    ctx.fillStyle = "rgba(150,165,195,0.28)";
    ctx.fillText(String(i + 1).padStart(2, "0"), 56, y);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, y);
    y += 56;
  });
  ctx.fillStyle = "#9fc0ff";
  ctx.fillRect(128, y - 24, 15, 28);

  // divider
  ctx.fillStyle = "rgba(150,170,210,0.14)";
  ctx.fillRect(split, 78, 1.5, H - 100);

  // ---- right: live systems panel
  const rx = split + 44;
  ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(190,205,235,0.55)";
  ctx.fillText("SYSTEMS", rx, 128);
  const rows: [string, string, string][] = [
    ["GPU", "62%", GRN],
    ["MEMORY", "3.1 GB", BLU],
    ["LATENCY", "18 ms", GRN],
    ["AGENTS", "12 ▲", RED],
  ];
  ctx.font = "600 26px ui-monospace, Menlo, monospace";
  let ry = 186;
  rows.forEach(([k, v, c]) => {
    ctx.fillStyle = DIM;
    ctx.fillText(k, rx, ry);
    ctx.fillStyle = c;
    ctx.textAlign = "right";
    ctx.fillText(v, W - 52, ry);
    ctx.textAlign = "left";
    ry += 52;
  });

  // activity chart (bars)
  const cx = rx;
  const cw = W - 52 - rx;
  const cyTop = 430;
  const ch = 220;
  ctx.fillStyle = "rgba(150,170,210,0.14)";
  ctx.fillRect(cx, cyTop + ch, cw, 1.5);
  const bars = [0.35, 0.55, 0.42, 0.7, 0.5, 0.82, 0.62, 0.9, 0.72, 1.0, 0.6, 0.78];
  const bw = (cw / bars.length) * 0.6;
  const gap = cw / bars.length;
  bars.forEach((b, i) => {
    const bh = b * ch;
    const bx = cx + i * gap + (gap - bw) / 2;
    const grad = ctx.createLinearGradient(0, cyTop + ch - bh, 0, cyTop + ch);
    grad.addColorStop(0, i === bars.length - 3 ? "#9fc0ff" : "rgba(120,160,255,0.85)");
    grad.addColorStop(1, "rgba(120,160,255,0.12)");
    ctx.fillStyle = grad;
    ctx.fillRect(bx, cyTop + ch - bh, bw, bh);
  });
  ctx.font = "600 20px ui-monospace, Menlo, monospace";
  ctx.fillStyle = "rgba(190,205,235,0.4)";
  ctx.fillText("throughput / 24h", rx, cyTop - 22);

  // inner bezel glow
  ctx.strokeStyle = "rgba(150,180,255,0.18)";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  return tex;
}

type Props = { highQuality: boolean };

/**
 * The physical screen the software beam lands on. Unlike a DOM overlay, this
 * lives IN the scene: a 16:9 plane pinned to the beam's landing point and
 * oriented PERPENDICULAR to the beam (its normal faces back down the beam
 * toward the projector) — so the light meets it square, no keystone, correct
 * depth/occlusion/scale. A charcoal frame, an additive halo and a fill light
 * sell it as a lit screen. Everything fades with `softwareProjectionFade`.
 */
export default function ProjectorScreen({ highQuality }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const pictureRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const terminalTex = useMemo(() => createTerminalTexture(), []);
  useEffect(() => () => terminalTex.dispose(), [terminalTex]);
  const haloTex = useMemo(
    () => createGlowTexture("rgba(150,180,255,0.5)", "rgba(110,150,235,0.14)"),
    [],
  );
  useEffect(() => () => haloTex.dispose(), [haloTex]);

  // scratch
  const forward = useMemo(() => new THREE.Vector3(), []);
  const land = useMemo(() => new THREE.Vector3(), []);
  const toLens = useMemo(() => new THREE.Vector3(), []);
  const qPerp = useMemo(() => new THREE.Quaternion(), []);
  const qFace = useMemo(() => new THREE.Quaternion(), []);
  const mFace = useMemo(() => new THREE.Matrix4(), []);
  const UP = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const FWD = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const fade = softwareProjectionFade(scroll.progress);
    g.visible = fade > 0.004;
    if (!g.visible) return;

    // landing point = a fixed distance along the lens axis
    forward.copy(FWD).applyQuaternion(projection.lensQuat);
    land.copy(forward).multiplyScalar(SOFT_THROW).add(projection.lensPos);
    g.position.copy(land);
    // physically the screen is perpendicular to the beam (normal → projector),
    // but a real screen is angled a little toward the audience for legibility —
    // so blend the perpendicular pose a third of the way toward facing the
    // camera. The beam still lands square enough to read as correct.
    toLens.copy(projection.lensPos).sub(land).normalize();
    qPerp.setFromUnitVectors(FWD, toLens);
    mFace.lookAt(state.camera.position, land, UP);
    qFace.setFromRotationMatrix(mFace);
    // mostly facing the viewer (legible, the hero of the shot) but kept a touch
    // toward beam-perpendicular so the light still reads as landing square
    g.quaternion.copy(qPerp).slerp(qFace, 0.6);

    if (pictureRef.current) pictureRef.current.opacity = fade;
    if (frameRef.current) frameRef.current.opacity = 0.95 * fade;
    if (haloRef.current) haloRef.current.opacity = 0.6 * fade;
    if (lightRef.current) lightRef.current.intensity = 42 * fade;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* additive halo bleeding past the edges */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[SCREEN_W * 1.7, SCREEN_H * 1.9]} />
        <meshBasicMaterial
          ref={haloRef}
          map={haloTex}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </mesh>

      {/* charcoal frame */}
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[SCREEN_W + 0.3, SCREEN_H + 0.3]} />
        <meshStandardMaterial
          ref={frameRef}
          color="#0b0e15"
          metalness={0.4}
          roughness={0.7}
          transparent
          opacity={0}
          fog={false}
        />
      </mesh>

      {/* the projected picture */}
      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial
          ref={pictureRef}
          map={terminalTex}
          transparent
          opacity={0}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      {/* the picture lights the stage (high tier only) */}
      {highQuality && (
        <pointLight
          ref={lightRef}
          position={[0, 0, 1.4]}
          color="#a9c2ff"
          intensity={0}
          distance={12}
          decay={2}
        />
      )}
    </group>
  );
}
