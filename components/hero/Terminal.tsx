"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { palette } from "@/lib/palette";

type Props = {
  reducedMotion: boolean;
};

const CODE_LINES = [
  "$ reypo deploy --target=vision",
  "import { aperture } from '@reypo/core'",
  "",
  "const lens = aperture.open({ blades: 10 })",
  "await pipeline.run(lens, { bloom: true })",
  "",
  "model = load('reypo-fable-5')",
  "stream = model.generate(prompt, { tools })",
  "for await (const chunk of stream) {",
  "  render(chunk)   // realtime",
  "}",
  "",
  "shader.compile('aperture.frag') ✓",
  "gpu.upload(meshes)  // 184k tris",
  "frame: 16.6ms  draw: 42  ✓",
  "",
  "POST /api/vision  200  18ms",
  "agent.step() -> focus(target)",
  "constellation.link(nodes) ✓",
  "build complete — 0 errors",
];

const LINE_H = 30;
const FONT = "20px ui-monospace, Menlo, monospace";

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  offset: number,
) {
  ctx.fillStyle = "#070b12";
  ctx.fillRect(0, 0, w, h);

  // header bar
  ctx.fillStyle = "#0e1622";
  ctx.fillRect(0, 0, w, 46);
  const dots = ["#ff5f57", "#febc2e", "#28c840"];
  dots.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(28 + i * 26, 23, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#5b6270";
  ctx.font = "16px ui-monospace, Menlo, monospace";
  ctx.fillText("reypo — ~/software", 120, 28);

  ctx.font = FONT;
  ctx.textBaseline = "top";
  const top = 60;
  const rows = Math.ceil((h - top) / LINE_H) + 2;
  const start = Math.floor(offset / LINE_H);
  const shift = offset % LINE_H;

  for (let r = 0; r < rows; r++) {
    const idx = ((start + r) % CODE_LINES.length + CODE_LINES.length) %
      CODE_LINES.length;
    const line = CODE_LINES[idx];
    const y = top + r * LINE_H - shift;
    // line number
    ctx.fillStyle = "#2b3340";
    ctx.fillText(String(idx + 1).padStart(2, "0"), 18, y);
    // content with a little syntax tint
    if (line.startsWith("$")) ctx.fillStyle = "#3b6bff";
    else if (line.includes("✓")) ctx.fillStyle = "#28c840";
    else if (line.startsWith("//") || line.includes("//"))
      ctx.fillStyle = "#7fd1ff";
    else ctx.fillStyle = "#c8cdd6";
    ctx.fillText(line, 64, y);
  }

  // blinking cursor
  if (Math.floor(offset / 14) % 2 === 0) {
    ctx.fillStyle = "#3b6bff";
    ctx.fillRect(64, h - 40, 12, 22);
  }
}

/**
 * Floating terminal panel with a live, continuously scrolling code stream drawn
 * to a CanvasTexture. Redraws at ~20fps to stay cheap.
 */
export default function Terminal({ reducedMotion }: Props) {
  const offset = useRef(0);
  const last = useRef(0);

  const { texture, ctx, canvas } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    draw(ctx, canvas.width, canvas.height, 0);
    return { texture, ctx, canvas };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (t - last.current < 0.05) return;
    last.current = t;
    offset.current += reducedMotion ? 0 : 1.6;
    draw(ctx, canvas.width, canvas.height, offset.current);
    texture.needsUpdate = true;
  });

  return (
    <group>
      {/* bezel */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[6.5, 4.15, 0.28]} />
        <meshStandardMaterial
          color={palette.charcoalLight}
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      {/* screen */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[6.05, 3.78]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* screen glow plate (caught by bloom) */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[6.2, 3.95]} />
        <meshBasicMaterial color={palette.blue} transparent opacity={0.06} />
      </mesh>
    </group>
  );
}
