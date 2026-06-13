"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { palette } from "@/lib/palette";
import { scroll } from "@/lib/scrollStore";

const BLADE_COUNT = 10;
const PIVOT_RADIUS = 1.95;
/** Blade twist (radians) about its pivot — opens/closes the aperture polygon. */
const APERTURE_CLOSED = 0.06;
const APERTURE_OPEN = 0.42;

type Props = {
  hovered: boolean;
  reducedMotion: boolean;
  highQuality: boolean;
};

/**
 * Procedural camera iris. Each blade is a wide quad whose concave inner edge is
 * a chord near the centre; the blade never crosses the centre, so the N inner
 * edges tile a clean near-circular aperture (no chaotic overlap in the middle).
 * Blades overlap their neighbours so no dark gaps show. A shared `aperture`
 * value rotates them together about their pivots to open/close like a lens.
 */
export default function ApertureBlades({
  hovered,
  reducedMotion,
  highQuality,
}: Props) {
  const groupsRef = useRef<THREE.Group[]>([]);
  const aperture = useRef(APERTURE_CLOSED);

  const bladeGeo = useMemo(() => {
    const innerX = 1.32; // inner edge distance from pivot toward centre
    const outerX = 0.14; // small reach outward (hidden under the silver ring)
    const H = 0.95; // half-width — 2H > pivot spacing so blades overlap
    const taper = 0.16;

    const shape = new THREE.Shape();
    shape.moveTo(outerX, -H);
    shape.lineTo(-innerX + 0.1, -H + taper);
    // concave inner edge (the aperture chord) bowing slightly toward centre
    shape.quadraticCurveTo(-innerX - 0.12, 0, -innerX + 0.1, H - taper);
    shape.lineTo(outerX, H);
    shape.quadraticCurveTo(outerX + 0.12, 0, outerX, -H);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: highQuality ? 2 : 1,
      curveSegments: highQuality ? 20 : 8,
      steps: 1,
    });
    geo.translate(0, 0, -0.05);
    geo.computeVertexNormals();
    return geo;
  }, [highQuality]);

  const bladeMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(palette.red),
        metalness: 0.85,
        roughness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.1,
        emissive: new THREE.Color(palette.red),
        emissiveIntensity: 0.02,
      }),
    [],
  );

  useFrame((_, delta) => {
    // scrolling into the experience opens the aperture (lens "focuses in")
    const scrollOpen = reducedMotion
      ? 0
      : THREE.MathUtils.smoothstep(scroll.progress, 0.04, 0.42);
    const base = THREE.MathUtils.lerp(
      hovered ? APERTURE_OPEN : APERTURE_CLOSED,
      APERTURE_OPEN,
      scrollOpen,
    );
    const breathe =
      reducedMotion || hovered || scrollOpen > 0.05
        ? 0
        : Math.sin(performance.now() * 0.0009) * 0.03;
    const desired = base + breathe;
    aperture.current = THREE.MathUtils.damp(aperture.current, desired, 4, delta);

    const phi = aperture.current;
    for (let i = 0; i < groupsRef.current.length; i++) {
      const g = groupsRef.current[i];
      if (!g) continue;
      g.rotation.z = (i / BLADE_COUNT) * Math.PI * 2 + phi;
    }
  });

  return (
    <group>
      {Array.from({ length: BLADE_COUNT }).map((_, i) => {
        const a = (i / BLADE_COUNT) * Math.PI * 2;
        return (
          <group
            key={i}
            ref={(el) => {
              if (el) groupsRef.current[i] = el;
            }}
            position={[
              Math.cos(a) * PIVOT_RADIUS,
              Math.sin(a) * PIVOT_RADIUS,
              // tiny z stagger so overlapping blades don't z-fight
              (i / BLADE_COUNT) * 0.02,
            ]}
            rotation={[0, 0, a + APERTURE_CLOSED]}
          >
            <mesh geometry={bladeGeo} material={bladeMat} />
          </group>
        );
      })}
    </group>
  );
}
