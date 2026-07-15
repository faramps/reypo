"use client";

import { useEffect, useRef } from "react";
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

const MONO = "ui-monospace, Menlo, Monaco, 'Cascadia Code', monospace";
const FONT = `20px ${MONO}`;
const LINE_H = 28;

const TITLE_H = 40;
const TAB_H = 36;
const STATUS_H = 28;
const CONTENT_TOP = TITLE_H + TAB_H + 14;

/** Syntax token colours. */
const COL = {
  base: "#c8cdd6",
  prompt: "#3b6bff",
  kw: "#7aa2ff",
  fn: "#5fd4c6",
  str: "#7dd39a",
  num: "#f2b85a",
  com: "#5b6b86",
  ok: "#28c840",
  err: "#ff5f57",
  punct: "#8b93a1",
  lineno: "#2b3340",
};

const KW = new Set([
  "import", "from", "const", "let", "await", "for", "of", "new",
  "return", "function", "async", "true", "false", "null",
]);

const TOKEN_RE =
  /(\/\/[^\n]*)|('[^']*'|"[^"]*"|`[^`]*`)|(\d[\d.]*)|([A-Za-z_$][\w$]*)|(✓|✗)|(\s+)|([{}()[\].,;:+*/=<>!|&%-]+)|(.)/g;

type Token = { t: string; c: string };

/** Lightweight per-line tokeniser → coloured spans for the terminal. */
function tokenize(line: string, base: string): Token[] {
  const out: Token[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(line))) {
    if (m[1]) out.push({ t: m[1], c: COL.com });
    else if (m[2]) out.push({ t: m[2], c: COL.str });
    else if (m[3]) out.push({ t: m[3], c: COL.num });
    else if (m[4]) {
      const w = m[4];
      let c = base;
      if (w === "$") c = COL.prompt;
      else if (KW.has(w)) c = COL.kw;
      else if (line[TOKEN_RE.lastIndex] === "(") c = COL.fn; // call site
      out.push({ t: w, c });
    } else if (m[5]) out.push({ t: m[5], c: m[5] === "✓" ? COL.ok : COL.err });
    else if (m[6]) out.push({ t: m[6], c: base });
    else if (m[7]) out.push({ t: m[7], c: COL.punct });
    else out.push({ t: m[8], c: base });
  }
  return out;
}

type Gfx = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  scan: CanvasPattern;
  vignette: CanvasGradient;
};

function tab(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  label: string,
  active: boolean,
) {
  ctx.fillStyle = active ? "#070b12" : "#0c1420";
  ctx.fillRect(x, TITLE_H, w, TAB_H);
  if (active) {
    ctx.fillStyle = COL.prompt;
    ctx.fillRect(x, TITLE_H, w, 2); // active accent
  }
  ctx.fillStyle = active ? "#cdd3de" : "#5b6b86";
  ctx.font = `14px ${MONO}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 16, TITLE_H + TAB_H / 2 + 1);
}

function draw(g: Gfx, offset: number) {
  const { ctx, w, h, scan, vignette } = g;

  // screen base
  ctx.fillStyle = "#070b12";
  ctx.fillRect(0, 0, w, h);

  // ---- title bar ----
  ctx.fillStyle = "#0c1420";
  ctx.fillRect(0, 0, w, TITLE_H);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(26 + i * 24, TITLE_H / 2, 6.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#6b7488";
  ctx.font = `15px ${MONO}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("reypo — zsh — ~/software", w / 2, TITLE_H / 2 + 1);
  ctx.textAlign = "left";

  // power LED (pulsing) on the right of the title bar
  const pulse = 0.55 + 0.45 * Math.sin(offset * 0.04);
  ctx.save();
  ctx.shadowColor = "#28c840";
  ctx.shadowBlur = 6 + pulse * 10;
  ctx.fillStyle = `rgba(54, 210, 96, ${0.55 + 0.4 * pulse})`;
  ctx.beginPath();
  ctx.arc(w - 28, TITLE_H / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- tab bar ----
  ctx.fillStyle = "#0a0f18";
  ctx.fillRect(0, TITLE_H, w, TAB_H);
  tab(ctx, 14, 196, "software.log", true);
  tab(ctx, 214, 176, "pipeline.ts", false);
  tab(ctx, 392, 132, "build", false);

  // ---- code stream (clipped to the content area) ----
  ctx.font = FONT;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const top = CONTENT_TOP;
  const bottom = h - STATUS_H;
  const rows = Math.ceil((bottom - top) / LINE_H) + 2;
  const start = Math.floor(offset / LINE_H);
  const shift = offset % LINE_H;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top - 2, w, bottom - top);
  ctx.clip();
  for (let r = 0; r < rows; r++) {
    const idx =
      (((start + r) % CODE_LINES.length) + CODE_LINES.length) %
      CODE_LINES.length;
    const line = CODE_LINES[idx];
    const y = top + r * LINE_H - shift;

    ctx.fillStyle = COL.lineno;
    ctx.fillText(String(idx + 1).padStart(2, "0"), 18, y);

    const base = line.startsWith("$") ? "#dfe5f2" : COL.base;
    let x = 64;
    for (const tok of tokenize(line, base)) {
      ctx.fillStyle = tok.c;
      ctx.fillText(tok.t, x, y);
      x += ctx.measureText(tok.t).width;
    }
  }
  ctx.restore();

  // blinking caret near the bottom of the content
  if (Math.floor(offset / 14) % 2 === 0) {
    ctx.fillStyle = COL.prompt;
    ctx.fillRect(64, bottom - LINE_H + 3, 11, 20);
  }

  // ---- status bar ----
  ctx.fillStyle = "#0c1420";
  ctx.fillRect(0, h - STATUS_H, w, STATUS_H);
  ctx.fillStyle = COL.prompt;
  ctx.fillRect(0, h - STATUS_H, 5, STATUS_H);
  const my = h - STATUS_H / 2 + 1;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#28c840";
  ctx.beginPath();
  ctx.arc(24, my, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `14px ${MONO}`;
  ctx.fillStyle = "#7c93c7";
  ctx.textAlign = "left";
  ctx.fillText("live · main", 38, my);
  ctx.fillStyle = "#5b6b86";
  ctx.textAlign = "right";
  ctx.fillText("utf-8 · ws · 60fps ✓", w - 18, my);
  ctx.textAlign = "left";

  // ---- CRT overlays ----
  ctx.fillStyle = scan;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

type TerminalGfx = { texture: THREE.CanvasTexture; g: Gfx };

/** Builds the offscreen canvas, texture and the cached CRT overlays. */
function createGfx(): TerminalGfx {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  // cached scanline pattern (one dark row every 3px)
  const sp = document.createElement("canvas");
  sp.width = 2;
  sp.height = 3;
  const spc = sp.getContext("2d")!;
  spc.fillStyle = "rgba(0, 0, 0, 0.22)";
  spc.fillRect(0, 0, 2, 1);
  const scan = ctx.createPattern(sp, "repeat")!;

  // cached edge vignette (curved-glass feel)
  const vignette = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.height * 0.32,
    canvas.width / 2,
    canvas.height / 2,
    canvas.height * 0.78,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;

  const g: Gfx = { ctx, w: canvas.width, h: canvas.height, scan, vignette };
  draw(g, 0);
  texture.needsUpdate = true;
  return { texture, g };
}

/**
 * Floating terminal panel: a live, continuously scrolling code stream with
 * token syntax highlighting, a tab bar, a status bar, a pulsing power LED and a
 * subtle CRT scanline + edge-vignette overlay — all drawn to a CanvasTexture on
 * the CPU and refreshed at ~20fps, so it costs the GPU nothing beyond one
 * textured quad.
 */
export default function Terminal({ reducedMotion }: Props) {
  const offset = useRef(0);
  const last = useRef(0);
  // All imperative state (canvas, 2D context, texture) lives in refs: it is
  // repainted and re-uploaded every frame, which the React Compiler only allows
  // through refs — never on values read during render. The texture is attached
  // to the material imperatively in the effect below.
  const ref = useRef<TerminalGfx | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    const gfx = (ref.current ??= createGfx());
    if (matRef.current) {
      matRef.current.map = gfx.texture;
      matRef.current.needsUpdate = true;
    }
    return () => {
      gfx.texture.dispose();
      ref.current = null; // recreate cleanly on StrictMode remount
    };
  }, []);

  useFrame((state) => {
    const gfx = (ref.current ??= createGfx());
    const t = state.clock.elapsedTime;
    if (t - last.current < 0.05) return;
    last.current = t;
    offset.current += reducedMotion ? 0 : 1.6;
    draw(gfx.g, offset.current);
    gfx.texture.needsUpdate = true;
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
      {/* screen — texture is attached to this material in the effect above */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[6.05, 3.78]} />
        <meshBasicMaterial ref={matRef} toneMapped={false} />
      </mesh>
      {/* screen glow plate (caught by bloom) */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[6.2, 3.95]} />
        <meshBasicMaterial color={palette.blue} transparent opacity={0.06} />
      </mesh>
    </group>
  );
}
