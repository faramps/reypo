"use client";

import { Suspense, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  AdaptiveDpr,
  PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";
import { palette } from "@/lib/palette";
import { useReducedMotion, useIsMobile } from "@/lib/useMediaQuery";
import { scroll } from "@/lib/scrollStore";
import StageRig from "./StageRig";
import DataConstellations from "./DataConstellations";
import PostFX from "./PostFX";

type Tier = "high" | "low";

/**
 * Pushes the camera into the scene as the page scrolls (deepening perspective)
 * and adds gentle pointer parallax. Reads the shared scroll store in the render
 * loop so it never triggers React re-renders.
 */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame((state, delta) => {
    const p = reducedMotion ? 0 : scroll.progress;
    const targetZ = THREE.MathUtils.lerp(
      11.5,
      13.5,
      THREE.MathUtils.smoothstep(p, 0, 0.4),
    );
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
    state.camera.position.z = THREE.MathUtils.damp(
      state.camera.position.z,
      targetZ,
      3,
      delta,
    );
    state.camera.lookAt(0, 0.3, 0);
  });
  return null;
}

/**
 * Root R3F canvas. Loaded only on the client via next/dynamic(ssr:false) from
 * HeroSection — Three.js needs `window`, which is unavailable during SSR.
 *
 * Quality is tiered (a practical LOD): the initial tier is chosen from the
 * device, then PerformanceMonitor downgrades to "low" if the frame rate drops.
 * The tier scales particle count, geometry detail, DOF and MSAA.
 */
export default function SceneCanvas() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [tier, setTier] = useState<Tier>(isMobile ? "low" : "high");

  const highQuality = tier === "high";
  const enableDOF = highQuality && !reducedMotion;
  const particleCount = highQuality ? 150 : 70;

  return (
    <Canvas
      dpr={[1, highQuality ? 2 : 1.5]}
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
          <Environment resolution={highQuality ? 256 : 128}>
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

          <StageRig reducedMotion={reducedMotion} highQuality={highQuality} />
          <DataConstellations
            count={particleCount}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </PerformanceMonitor>

      <CameraRig reducedMotion={reducedMotion} />
      <PostFX enableDOF={enableDOF} highQuality={highQuality} />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
