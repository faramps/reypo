"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import { band, clipIndexFor } from "@/lib/projection";
import { SHOWREEL_CLIPS } from "@/lib/siteConfig";

const PANEL_W = 3.5;
/** Portrait cards render TALLER than the 16:9 card — a 9:16 cover squeezed to
    the landscape card's height would read tiny next to the centre screen. */
const PANEL_PORTRAIT_H = 3.0;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Film-strip placeholder for a reel whose cover isn't captured yet. */
function createReelPlaceholder(label: string): THREE.CanvasTexture {
  const W = 768;
  const H = 432;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d1322");
  bg.addColorStop(1, "#070a12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // sprockets
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 10; i++) {
    const x = ((i + 0.5) / 10) * W - 12;
    ctx.fillRect(x, 12, 24, 14);
    ctx.fillRect(x, H - 26, 24, 14);
  }
  // play badge
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(W / 2 - 10, H / 2 - 17);
  ctx.lineTo(W / 2 + 19, H / 2);
  ctx.lineTo(W / 2 - 10, H / 2 + 17);
  ctx.closePath();
  ctx.fill();
  ctx.font = "600 22px ui-monospace, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(200,210,235,0.5)";
  ctx.fillText(label, W / 2, H - 46);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/**
 * Cover cache: ONE texture per POSTER url, shared for the page's life, so the
 * gallery can re-arrange covers instantly as the active reel changes. The
 * texture keeps the poster's OWN aspect — the card shapes itself to the clip
 * (a 9:16 reel gets a tall phone-format card), so there are never filler
 * bands around the picture. Loading the pixels as a WebGL texture needs CORS
 * (crossOrigin), which the R2 custom domain provides; until CORS is live the
 * image errors and the panel keeps its film-strip placeholder.
 */
const coverCache = new Map<string, THREE.CanvasTexture>();
const coverPending = new Set<string>();
const coverWaiters = new Map<string, Set<(t: THREE.CanvasTexture) => void>>();

function composePoster(img: HTMLImageElement): THREE.CanvasTexture {
  // canvas takes the poster's aspect (long side 768) — full-bleed, no bands
  const iw = img.naturalWidth || 16;
  const ih = img.naturalHeight || 9;
  const c = document.createElement("canvas");
  if (iw >= ih) {
    c.width = 768;
    c.height = Math.max(1, Math.round((768 * ih) / iw));
  } else {
    c.height = 768;
    c.width = Math.max(1, Math.round((768 * iw) / ih));
  }
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  return t;
}

function requestCover(
  url: string,
  cb: (t: THREE.CanvasTexture) => void,
): () => void {
  const hit = coverCache.get(url);
  if (hit) {
    cb(hit);
    return () => {};
  }
  let waiters = coverWaiters.get(url);
  if (!waiters) {
    waiters = new Set();
    coverWaiters.set(url, waiters);
  }
  waiters.add(cb);

  if (!coverPending.has(url)) {
    coverPending.add(url);
    const img = new Image();
    img.crossOrigin = "anonymous"; // CORS-approved pixels → usable as a WebGL texture
    img.decoding = "async";
    img.onload = () => {
      const t = composePoster(img);
      coverCache.set(url, t);
      coverPending.delete(url);
      coverWaiters.get(url)?.forEach((f) => f(t));
      coverWaiters.delete(url);
    };
    img.onerror = () => {
      coverPending.delete(url); // a later request may retry (e.g. once CORS is live)
    };
    // Fetch the pixels under a DISTINCT URL (?webgltex) so this crossOrigin load
    // can never reuse a NO-CORS cached copy of the same .jpg — e.g. one a <video
    // poster> once fetched without CORS. That mismatch tainted the texture and
    // the cover silently fell back to the film-strip (reel 0 / kocaeli was hit
    // because it doubled as the centre-video poster). A separate cache key sidesteps
    // it entirely, and keeps working even on browsers that already cached the poison.
    img.src = url + (url.includes("?") ? "&" : "?") + "webgltex";
  }

  return () => {
    coverWaiters.get(url)?.delete(cb);
  };
}

function useCover(url?: string): THREE.CanvasTexture | null {
  // cache hits resolve during render; only misses subscribe for the load
  const cached = url ? (coverCache.get(url) ?? null) : null;
  const [loaded, setLoaded] = useState<{
    url: string;
    tex: THREE.CanvasTexture;
  } | null>(null);
  useEffect(() => {
    if (!url || coverCache.has(url)) return;
    return requestCover(url, (tex) => setLoaded({ url, tex }));
  }, [url]);
  // shared page-lifetime cache — never disposed here
  return cached ?? (loaded && loaded.url === url ? loaded.tex : null);
}

/** One angled gallery panel showing the cover of reel `clipIdx` (or hidden). */
function WallPanel({ side, clipIdx }: { side: -1 | 1; clipIdx: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const picRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameRef = useRef<THREE.MeshStandardMaterial>(null);
  // brief dip-and-recover when this panel's cover swaps to another reel
  const swapRef = useRef({ last: -2, t: 9 });

  const has = clipIdx >= 0;
  const clip = has ? SHOWREEL_CLIPS[clipIdx] : undefined;
  const label = has ? `REEL ${pad2(clipIdx + 1)}` : "REEL --";
  const cover = useCover(clip?.poster || undefined);
  const placeholder = useMemo(() => createReelPlaceholder(label), [label]);
  useEffect(() => () => placeholder.dispose(), [placeholder]);
  const tex = cover ?? placeholder;

  // the card takes the cover's shape: landscape keeps the classic 16:9 card;
  // portrait reels get a tall phone-format card (no filler bands to hide)
  const texImg = tex.image as { width: number; height: number } | undefined;
  const a = texImg && texImg.height ? texImg.width / texImg.height : 16 / 9;
  const pw = a >= 1 ? PANEL_W : PANEL_PORTRAIT_H * a;
  const ph = a >= 1 ? PANEL_W / a : PANEL_PORTRAIT_H;

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const p = scroll.progress;
    // sides arrive a beat after the centre projection, leave with the act
    const w = has ? band(p, 0.26, 0.38, 0.52, 0.6) : 0;
    g.visible = w > 0.01;
    if (!g.visible) return;

    const s = swapRef.current;
    if (s.last !== clipIdx) {
      s.last = clipIdx;
      s.t = 0;
    }
    s.t = Math.min(s.t + delta, 9);
    const settle = 1 - Math.exp(-s.t * 7); // 0 → 1 over ~0.4s

    // slide in from the side while fading; narrower (portrait) cards shift
    // inward so every card's INNER edge lands where the 16:9 card's does
    const x =
      side *
      (THREE.MathUtils.lerp(6.4, 4.9, Math.min(1, w * 1.4)) -
        (PANEL_W - pw) / 2);
    g.position.x = THREE.MathUtils.damp(g.position.x, x, 6, delta);
    // covers sit dimmer than the live centre screen; dip on swap
    if (picRef.current) picRef.current.opacity = 0.85 * w * (0.25 + 0.75 * settle);
    if (frameRef.current) frameRef.current.opacity = 0.95 * w;
  });

  return (
    <group
      ref={groupRef}
      visible={false}
      position={[side * 6.4, 0.35, -1.2]}
      rotation={[0, -side * 0.42, 0]}
    >
      <mesh position={[0, 0, -0.03]} scale={[pw + 0.22, ph + 0.22, 1]}>
        <planeGeometry args={[1, 1]} />
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
      <mesh scale={[pw, ph, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={picRef}
          map={tex}
          transparent
          opacity={0}
          toneMapped={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

/**
 * The GALLERY around the centre screen: while reel N plays, its neighbours'
 * covers flank it — previous on the left, next on the right (wrapping, so the
 * wall always reads as "more work either side"). The covers never play; the
 * centre screen is the only live video. Covers come from the shared poster
 * cache, pre-warmed here so stepping reels re-arranges them instantly.
 */
export default function VideoWall() {
  // Narrow (phone) viewports can't fit the angled side covers — they only clip
  // in at the screen edges — so the gallery is a wide-screen flourish only.
  const mobile = useThree((s) => s.size.width) < 768;
  const n = SHOWREEL_CLIPS.length;
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  // pre-warm every poster cover once, so stepping reels re-arranges them
  // instantly (posters are light — a few parallel image loads is fine)
  useEffect(() => {
    const uns = SHOWREEL_CLIPS.map((c) =>
      c.poster ? requestCover(c.poster, () => {}) : () => {},
    );
    return () => uns.forEach((un) => un());
  }, []);

  useFrame(() => {
    const i = clipIndexFor(scroll.progress);
    if (i !== activeRef.current) {
      activeRef.current = i;
      setActive(i); // once per reel change — not per frame
    }
  });

  const left = n >= 2 ? (active - 1 + n) % n : -1;
  const right = n >= 3 ? (active + 1) % n : -1;

  if (mobile) return null;

  return (
    <>
      <WallPanel side={-1} clipIdx={left} />
      <WallPanel side={1} clipIdx={right} />
    </>
  );
}
