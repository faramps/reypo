"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ApertureBlades from "./ApertureBlades";
import Pupil from "./Pupil";
import LensHousing from "./LensHousing";

type Props = {
  reducedMotion: boolean;
  highQuality: boolean;
};

/**
 * The interactive hub: lens housing + iris blades + tracking pupil.
 * Tilts gently toward the pointer for parallax; blades react to hover.
 * `highQuality` scales geometry segment counts (LOD).
 */
export default function ApertureEye({ reducedMotion, highQuality }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Subtle tilt — kept small so the dark backing between blades stays hidden.
  const tilt = 0.12;

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const targetRx = reducedMotion ? 0 : -state.pointer.y * tilt;
    const targetRy = reducedMotion ? 0 : state.pointer.x * tilt;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetRx, 3, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRy, 3, delta);
  });

  return (
    <group ref={groupRef}>
      {/* invisible (opacity 0) hover catcher — kept visible:true so it raycasts */}
      <mesh
        position={[0, 0, 0.25]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <circleGeometry args={[2.7, 48]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <LensHousing highQuality={highQuality} />

      <ApertureBlades
        hovered={hovered}
        reducedMotion={reducedMotion}
        highQuality={highQuality}
      />
      <Pupil reducedMotion={reducedMotion} highQuality={highQuality} />
    </group>
  );
}
