"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { palette } from "@/lib/palette";

type Props = {
  count: number;
  reducedMotion: boolean;
};

/**
 * Cinematic particle field: points distributed in a shell around the eye, kept
 * behind the camera plane (no wasted off-screen geometry), with near-neighbours
 * linked into faint constellation lines. Count is driven by the quality tier.
 */
export default function DataConstellations({ count, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const { pointsGeo, linesGeo } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const pts: THREE.Vector3[] = [];
    const innerR = 4.5;
    const outerR = 11;

    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        (Math.random() - 0.5) * 0.7,
        Math.random() - 0.5,
      ).normalize();
      const r = innerR + Math.random() * (outerR - innerR);
      const p = dir.multiplyScalar(r);
      // keep the field behind the eye and well away from the camera (z = 7.5)
      p.z = Math.min(p.z - 2.5, 1.5);
      pts.push(p);
      positions.set([p.x, p.y, p.z], i * 3);
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const linePositions: number[] = [];
    const maxDist = 2.6;
    const maxLinksPerNode = 2;
    for (let i = 0; i < pts.length; i++) {
      let links = 0;
      for (let j = i + 1; j < pts.length && links < maxLinksPerNode; j++) {
        if (pts[i].distanceTo(pts[j]) < maxDist) {
          linePositions.push(
            pts[i].x, pts[i].y, pts[i].z,
            pts[j].x, pts[j].y, pts[j].z,
          );
          links++;
        }
      }
    }
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );

    return { pointsGeo, linesGeo };
  }, [count]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (!reducedMotion) g.rotation.y += delta * 0.012;
    const px = reducedMotion ? 0 : state.pointer.x * 0.25;
    const py = reducedMotion ? 0 : state.pointer.y * 0.25;
    g.position.x = THREE.MathUtils.damp(g.position.x, px, 2, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, py, 2, delta);
  });

  return (
    <group ref={groupRef}>
      <points geometry={pointsGeo}>
        <pointsMaterial
          size={0.055}
          color={palette.silver}
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={linesGeo}>
        <lineBasicMaterial
          color={palette.blueGlow}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
