import * as THREE from "three";

/**
 * Soft radial glow sprite — shared by the projector's lamp flare and the
 * screen's halo. Client-only (canvas): callers all live under the ssr:false
 * R3F canvas.
 */
export function createGlowTexture(
  inner = "rgba(236, 243, 255, 0.9)",
  mid = "rgba(150, 182, 255, 0.26)",
): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, mid);
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}
