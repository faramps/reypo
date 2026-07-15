"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

/** Paints the front-element optics: iridescent coating arcs + curved-glass glints. */
function createGlassTexture(): THREE.CanvasTexture {
  const s = 512;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const cx = s / 2;
  const cy = s / 2;
  const R = s / 2;

  ctx.clearRect(0, 0, s, s);
  ctx.save();
  // confine every reflection to the round glass element
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // multi-coating iridescence near the rim — the tell-tale lens-coating colours
  const arcs: [string, number, number, number, number][] = [
    ["rgba(70, 130, 255, 0.20)", 0.96, -2.5, -0.9, 6],
    ["rgba(255, 70, 190, 0.14)", 0.9, -2.3, -1.2, 5],
    ["rgba(70, 255, 215, 0.12)", 0.84, 0.6, 2.1, 5],
    ["rgba(170, 130, 255, 0.12)", 0.99, 1.8, 2.8, 4],
  ];
  for (const [col, rf, a0, a1, w] of arcs) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, R * rf, a0, a1);
    ctx.stroke();
  }

  // primary curved-glass glint (upper-left)
  const gx = cx - R * 0.4;
  const gy = cy - R * 0.46;
  const g1 = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.62);
  g1.addColorStop(0, "rgba(225, 234, 255, 0.55)");
  g1.addColorStop(0.45, "rgba(150, 180, 255, 0.12)");
  g1.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, s, s);

  // smaller secondary glint (lower-right)
  const hx = cx + R * 0.5;
  const hy = cy + R * 0.52;
  const g2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.3);
  g2.addColorStop(0, "rgba(180, 205, 255, 0.3)");
  g2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, s, s);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/**
 * Front-element optics overlay. A curved-glass specular glint plus a few
 * iridescent multi-coating arcs, blended *additively* over the iris so it only
 * ever adds light — the blades and pupil read straight through it. This is the
 * cue that sells "real camera lens" without disturbing the existing composition.
 * Rendered inside the ApertureEye group, so it tilts (and the reflection slides)
 * with the pointer parallax.
 */
export default function LensGlass() {
  const [texture] = useState(createGlassTexture);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={[0, 0, 0.42]}>
      <circleGeometry args={[2.08, 64]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        opacity={0.9}
      />
    </mesh>
  );
}
