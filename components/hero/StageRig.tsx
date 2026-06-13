"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import ReelCamera from "./ReelCamera";

type Props = {
  reducedMotion: boolean;
  highQuality: boolean;
};

/**
 * Scroll-driven turntable. One combined device (reel camera with the terminal
 * built into its back) rotates 180° to the right: head-on lens (hero) → 3/4
 * movie camera (video arm) → the back, where the live terminal faces the viewer
 * (software arm). To the user the page feels fixed — only the device rotates.
 */
export default function StageRig({ reducedMotion, highQuality }: Props) {
  const rigRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const p = reducedMotion ? 0 : scroll.progress;
    const rigRot = THREE.MathUtils.lerp(
      0,
      -Math.PI,
      THREE.MathUtils.smoothstep(p, 0.05, 0.85),
    );
    if (rigRef.current) {
      rigRef.current.rotation.y = THREE.MathUtils.damp(
        rigRef.current.rotation.y,
        rigRot,
        4,
        delta,
      );
    }
  });

  return (
    <group ref={rigRef}>
      <ReelCamera reducedMotion={reducedMotion} highQuality={highQuality} />
    </group>
  );
}
