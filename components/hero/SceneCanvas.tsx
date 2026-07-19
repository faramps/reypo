"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  AdaptiveDpr,
  PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";
import { palette } from "@/lib/palette";
import { useReducedMotion } from "@/lib/useMediaQuery";
import { useLanguage } from "@/lib/i18n";
import { detectTier, type Tier } from "@/lib/quality";
import { scroll } from "@/lib/scrollStore";
import StageRig from "./StageRig";
import DataConstellations from "./DataConstellations";
import PostFX from "./PostFX";

const HALF_FOV_TAN = Math.tan((40 * Math.PI) / 180 / 2);

/**
 * Camera distance that keeps the whole aperture framed. Desktop / landscape
 * stays at the tuned ~11; on portrait phones the vertical FOV leaves the wide
 * lens cropped sideways, so we pull back just enough to fit it across the width
 * (clamped so ultra-tall screens don't push it too far / into the fog).
 */
function fitDistance(aspect: number) {
  return Math.min(18, Math.max(11, 3.2 / (HALF_FOV_TAN * Math.min(aspect, 1))));
}

/**
 * Pushes the camera into the scene as the page scrolls (deepening perspective)
 * and adds gentle pointer parallax. Reads the shared scroll store in the render
 * loop so it never triggers React re-renders. The base distance is responsive
 * (see `fitDistance`) and snapped on the first frame so portrait phones don't
 * visibly zoom out on load.
 */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const inited = useRef(false);
  useFrame((state, delta) => {
    const p = reducedMotion ? 0 : scroll.progress;
    const base = fitDistance(state.size.width / Math.max(1, state.size.height));
    const targetZ =
      base + THREE.MathUtils.lerp(0.5, 2.5, THREE.MathUtils.smoothstep(p, 0, 0.4));
    const px = reducedMotion ? 0 : state.pointer.x * 0.4;
    const py = reducedMotion ? 0 : state.pointer.y * 0.4;
    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      px,
      3,
      delta,
    );
    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      py,
      3,
      delta,
    );
    if (!inited.current) {
      inited.current = true;
      state.camera.position.z = targetZ;
    } else {
      state.camera.position.z = THREE.MathUtils.damp(
        state.camera.position.z,
        targetZ,
        3,
        delta,
      );
    }
    state.camera.lookAt(0, 0.3, 0);
  });
  return null;
}

/**
 * Pre-compiles every material in the scene before we reveal the canvas. Where
 * the GPU exposes KHR_parallel_shader_compile (`compileAsync`) this builds the
 * shader programs off the main thread, so the cold-start program build that
 * previously froze the page for ~15s now happens behind the branded loader.
 * Falls back to a synchronous compile (still hidden by the loader) and a hard
 * timeout so the scene can never get stuck invisible.
 */
function Warmup({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let settled = false;
    const reveal = () => {
      if (settled) return;
      settled = true;
      // Wait two painted frames so the (hidden) post stack has compiled too,
      // then hand off to the fade-in.
      requestAnimationFrame(() => requestAnimationFrame(onReady));
    };

    const renderer = gl as unknown as {
      compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown>;
      compile: (s: THREE.Object3D, c: THREE.Camera) => void;
    };

    if (renderer.compileAsync) {
      renderer.compileAsync(scene, camera).then(reveal, reveal);
    } else {
      try {
        renderer.compile(scene, camera);
      } catch {
        /* compile is best-effort; reveal regardless */
      }
      reveal();
    }

    const safety = setTimeout(reveal, 8000);
    return () => clearTimeout(safety);
  }, [gl, scene, camera, onReady]);

  return null;
}

/** Branded overlay shown until the scene's shaders are compiled. */
function Loader() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <span className="aperture-spinner" aria-hidden />
        <span className="text-sm font-medium uppercase tracking-[0.4em] text-silver/60">
          reypo
        </span>
      </div>
    </div>
  );
}

/**
 * Root R3F canvas. Loaded only on the client via next/dynamic(ssr:false) from
 * HeroSection — Three.js needs `window`, which is unavailable during SSR.
 *
 * Quality is tiered (a practical LOD). The initial tier is chosen *synchronously*
 * from device signals (`detectTier`) so weak phones never attempt the heavy path;
 * `PerformanceMonitor` then downgrades to "low" if the frame rate still drops.
 * The tier scales DPR, particle count, geometry detail, the environment map,
 * clearcoat materials, Bloom and MSAA.
 */
export default function SceneCanvas() {
  const reducedMotion = useReducedMotion();
  // React context doesn't cross into the R3F tree — resolve the localised
  // strings here (DOM side) and pass them down as plain props.
  const { t } = useLanguage();
  // Lazy initializer runs once on the client (canvas is ssr:false) with the real
  // device signals — so a phone boots straight into "low" instead of "high".
  const [tier, setTier] = useState<Tier>(() => detectTier());
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  const highQuality = tier === "high";
  // Yıldız/takımyıldız yoğunluğu kalite kademesinden BAĞIMSIZ: noktalar + çizgiler
  // ucuzdur, FPS'i düşüren şey DPR/bloom/env. Perf gözcüsü kademeyi "low"a indirse
  // bile alan dolu kalsın diye sabit tutuyoruz (site açılışındaki dolgun hâl).
  const particleCount = 220;

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Canvas
          dpr={[1, highQuality ? 2 : 1.25]}
          camera={{ position: [0, 0, 11], fov: 40 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
        >
          <color attach="background" args={[palette.backgroundDeep]} />
          <fog attach="fog" args={[palette.backgroundDeep, 16, 42]} />

          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setTier("low")}
            onFallback={() => setTier("low")}
          >
            <ambientLight intensity={0.38} />
            {/* neutral key fills the blades so they read metallic, not flat-red */}
            <pointLight
              position={[0, 0, 7]}
              intensity={52}
              color={palette.white}
              distance={26}
              decay={2}
            />
            <pointLight
              position={[6, 4, 6]}
              intensity={40}
              color={palette.redGlow}
              distance={30}
              decay={2}
            />
            <pointLight
              position={[-6, -3, 5]}
              intensity={42}
              color={palette.blueGlow}
              distance={30}
              decay={2}
            />

            <Suspense fallback={null}>
              <Environment resolution={highQuality ? 160 : 96}>
                <Lightformer
                  intensity={1.4}
                  position={[0, 4, -6]}
                  scale={[10, 4, 1]}
                  color={palette.white}
                />
                <Lightformer
                  intensity={2.4}
                  position={[6, 0, -4]}
                  scale={[4, 8, 1]}
                  color={palette.red}
                />
                <Lightformer
                  intensity={2}
                  position={[-6, 0, -4]}
                  scale={[4, 8, 1]}
                  color={palette.blue}
                />
              </Environment>

              <StageRig
                reducedMotion={reducedMotion}
                highQuality={highQuality}
                worksTitle={t.worksTitle}
              />
              <DataConstellations
                count={particleCount}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </PerformanceMonitor>

          <CameraRig reducedMotion={reducedMotion} />
          <PostFX tier={tier} />
          <AdaptiveDpr pixelated />
          <Warmup onReady={onReady} />
        </Canvas>
      </div>

      {!ready && <Loader />}
    </div>
  );
}
