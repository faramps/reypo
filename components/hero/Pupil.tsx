"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { palette } from "@/lib/palette";

type Props = {
  reducedMotion: boolean;
  highQuality: boolean;
};

/**
 * Logo-blue emissive pupil that tracks the pointer like a watchman's eye,
 * staying centred within the aperture. Sits in front of the blades on z.
 */
export default function Pupil({ reducedMotion, highQuality }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const maxOffset = 0.32;
    const tx = reducedMotion ? 0 : state.pointer.x * maxOffset;
    const ty = reducedMotion ? 0 : state.pointer.y * maxOffset;
    g.position.x = THREE.MathUtils.damp(g.position.x, tx, 5, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, ty, 5, delta);
  });

  const sphereSeg = highQuality ? 48 : 24;
  const torusSeg = highQuality ? 80 : 40;

  return (
    <group ref={groupRef} position={[0, 0, 0.35]}>
      {/* blue pupil */}
      <mesh>
        <sphereGeometry args={[0.42, sphereSeg, sphereSeg]} />
        <meshStandardMaterial
          color={palette.blue}
          emissive={palette.blueGlow}
          emissiveIntensity={1.5}
          metalness={0.2}
          roughness={0.25}
        />
      </mesh>
      {/* specular catchlight */}
      <mesh position={[0.13, 0.15, 0.34]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshBasicMaterial color={palette.white} />
      </mesh>
      {/* silver iris ring framing the pupil */}
      <mesh position={[0, 0, -0.06]}>
        <torusGeometry args={[0.62, 0.05, 16, torusSeg]} />
        <meshStandardMaterial
          color={palette.silver}
          metalness={1}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}
