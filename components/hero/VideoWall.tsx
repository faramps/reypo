"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import { band, clipIndexFor } from "@/lib/projection";
import { SHOWREEL_CLIPS } from "@/lib/siteConfig";

const PANEL_W = 3.5;
const PANEL_H = PANEL_W * (9 / 16);

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
 * Cover cache: ONE captured frame per clip src, shared for the page's life,
 * so the gallery can re-arrange covers instantly as the active reel changes.
 * Capture grabs a single frame with a throwaway <video>, composes it onto the
 * panel's 16:9 (non-16:9 clips sit sharp over a blurred cover fill) and then
 * releases the decoder — no live media element survives.
 */
const coverCache = new Map<string, THREE.CanvasTexture>();
const coverPending = new Set<string>();
const coverWaiters = new Map<string, Set<(t: THREE.CanvasTexture) => void>>();

function requestCover(
  src: string,
  cb: (t: THREE.CanvasTexture) => void,
): () => void {
  const hit = coverCache.get(src);
  if (hit) {
    cb(hit);
    return () => {};
  }
  let waiters = coverWaiters.get(src);
  if (!waiters) {
    waiters = new Set();
    coverWaiters.set(src, waiters);
  }
  waiters.add(cb);

  if (!coverPending.has(src)) {
    coverPending.add(src);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = src;

    const release = () => {
      video.removeAttribute("src");
      video.load();
    };
    let done = false;
    const capture = () => {
      if (done || video.readyState < 2) return;
      done = true;
      const c = document.createElement("canvas");
      c.width = 768;
      c.height = 432;
      const ctx = c.getContext("2d")!;
      const vw = video.videoWidth || 16;
      const vh = video.videoHeight || 9;
      const cover = Math.max(c.width / vw, c.height / vh);
      ctx.filter = "blur(26px) brightness(0.5)";
      ctx.drawImage(
        video,
        (c.width - vw * cover) / 2,
        (c.height - vh * cover) / 2,
        vw * cover,
        vh * cover,
      );
      ctx.filter = "none";
      const fit = Math.min(c.width / vw, c.height / vh);
      ctx.drawImage(
        video,
        (c.width - vw * fit) / 2,
        (c.height - vh * fit) / 2,
        vw * fit,
        vh * fit,
      );
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      coverCache.set(src, t);
      coverPending.delete(src);
      coverWaiters.get(src)?.forEach((f) => f(t));
      coverWaiters.delete(src);
      release();
    };
    const onMeta = () => {
      // a beat past the start — frame 0 is often black
      try {
        video.currentTime = Math.min(1.2, (video.duration || 0) * 0.1 || 0.1);
      } catch {
        /* not seekable: capture whatever frame arrives */
      }
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("seeked", capture);
    video.addEventListener("loadeddata", capture); // fallback if the seek no-ops
    video.addEventListener("error", () => {
      coverPending.delete(src); // a later request may retry
      release();
    });
    video.load();
  }

  return () => {
    coverWaiters.get(src)?.delete(cb);
  };
}

function useCover(src?: string): THREE.CanvasTexture | null {
  // cache hits resolve during render; only misses subscribe for the capture
  const cached = src ? (coverCache.get(src) ?? null) : null;
  const [loaded, setLoaded] = useState<{
    src: string;
    tex: THREE.CanvasTexture;
  } | null>(null);
  useEffect(() => {
    if (!src || coverCache.has(src)) return;
    return requestCover(src, (tex) => setLoaded({ src, tex }));
  }, [src]);
  // shared page-lifetime cache — never disposed here
  return cached ?? (loaded && loaded.src === src ? loaded.tex : null);
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
  const cover = useCover(clip?.src || undefined);
  const placeholder = useMemo(() => createReelPlaceholder(label), [label]);
  useEffect(() => () => placeholder.dispose(), [placeholder]);

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

    // slide in from the side while fading
    const x = side * THREE.MathUtils.lerp(6.4, 4.9, Math.min(1, w * 1.4));
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
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[PANEL_W + 0.22, PANEL_H + 0.22]} />
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
      <mesh>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial
          ref={picRef}
          map={cover ?? placeholder}
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
 * centre screen is the only live video. Covers come from the shared one-frame
 * cache, pre-warmed here so stepping reels re-arranges them instantly.
 */
export default function VideoWall() {
  const n = SHOWREEL_CLIPS.length;
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  // pre-warm every cover once (sequentially — one throwaway decoder at a time)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const c of SHOWREEL_CLIPS) {
        if (cancelled || !c.src) continue;
        await new Promise<void>((resolve) => {
          const un = requestCover(c.src, () => resolve());
          // guard: if the file errors the waiters never fire — don't hang
          setTimeout(() => {
            un();
            resolve();
          }, 15000);
        });
      }
    })();
    return () => {
      cancelled = true;
    };
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

  return (
    <>
      <WallPanel side={-1} clipIdx={left} />
      <WallPanel side={1} clipIdx={right} />
    </>
  );
}
