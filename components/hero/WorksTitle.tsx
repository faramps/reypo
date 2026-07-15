"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";

/** Crisp canvas-rendered headline (no webfont fetch; Turkish glyphs safe). */
function createTitleTexture(text: string): THREE.CanvasTexture {
  const W = 2048;
  const H = 384;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      "28px";
  } catch {
    /* older engines: skip */
  }
  // shrink-to-fit: longer localisations (e.g. "SELECTED WORKS") step the font
  // down until the line sits comfortably inside the canvas
  const font = (size: number) =>
    `800 ${size}px ui-sans-serif, system-ui, 'Segoe UI', Arial, sans-serif`;
  let size = 176;
  ctx.font = font(size);
  while (size > 96 && ctx.measureText(text).width > W - 180) {
    size -= 8;
    ctx.font = font(size);
  }
  // soft glow pass, then the crisp fill
  ctx.shadowColor = "rgba(150,180,255,0.55)";
  ctx.shadowBlur = 60;
  ctx.fillStyle = "#f4f6fb";
  ctx.fillText(text, W / 2 + 14, H / 2 - 26);
  ctx.shadowBlur = 0;
  ctx.fillText(text, W / 2 + 14, H / 2 - 26);

  // red accent underline
  ctx.fillStyle = "#e8232b";
  ctx.fillRect(W / 2 - 150, H / 2 + 96, 300, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  return tex;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/**
 * 3D section title for the works/video act. It materialises at centre stage
 * BEFORE the projection ignites, then glides up and docks at the top of the
 * frame while the multi-video showcase plays below. A dark offset copy behind
 * the face gives it physical depth in the scene. The text comes through props
 * (from the i18n dict — React context doesn't cross the R3F renderer boundary,
 * so the DOM side passes the resolved string down instead).
 */
export default function WorksTitle({ text }: { text: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const faceRef = useRef<THREE.MeshBasicMaterial>(null);
  const backRef = useRef<THREE.MeshBasicMaterial>(null);

  const tex = useMemo(() => createTitleTexture(text), [text]);
  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const p = scroll.progress;
    const appear = ramp(p, 0.07, 0.13);
    const rise = THREE.MathUtils.smoothstep(p, 0.15, 0.27);
    const leave = ramp(p, 0.52, 0.6);
    const op = appear * (1 - leave);

    g.visible = op > 0.01;
    if (!g.visible) return;

    // dock ABOVE the DOM video's top edge (~17% of the viewport), between it
    // and the top bar, so the title stays readable through the whole act
    const y = THREE.MathUtils.lerp(0.55, 3.68, rise);
    const s = THREE.MathUtils.lerp(1, 0.5, rise);
    g.position.x = 0;
    g.position.y = THREE.MathUtils.damp(g.position.y, y, 6, delta);
    g.position.z = 1.4;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 6, delta));

    if (faceRef.current) faceRef.current.opacity = op;
    if (backRef.current) backRef.current.opacity = 0.35 * op;
  });

  return (
    <group ref={groupRef} visible={false} position={[0, 0.55, 1.4]}>
      {/* depth copy */}
      <mesh position={[0.05, -0.05, -0.06]}>
        <planeGeometry args={[5.6, 1.05]} />
        <meshBasicMaterial
          ref={backRef}
          map={tex}
          color="#1a2440"
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      {/* face */}
      <mesh>
        <planeGeometry args={[5.6, 1.05]} />
        <meshBasicMaterial
          ref={faceRef}
          map={tex}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}
