"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { palette } from "@/lib/palette";

type Props = {
  highQuality: boolean;
};

/**
 * Detailed camera-lens housing around the iris: a tapered barrel with a knurled
 * focus ring, a charcoal lens face that masks the blades' outer ends (so the
 * aperture always reads as a clean circle), concentric silver/red rings, engraved
 * index ticks, and a clear-coated glass element behind the blades.
 * Detail counts scale with the quality tier (LOD).
 */
export default function LensHousing({ highQuality }: Props) {
  const knurlRef = useRef<THREE.InstancedMesh>(null);
  const tickRef = useRef<THREE.InstancedMesh>(null);
  const knurlCount = highQuality ? 84 : 40;
  const tickCount = highQuality ? 72 : 36;
  const seg = highQuality ? 128 : 56;

  useLayoutEffect(() => {
    const mesh = knurlRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const ringR = 2.97;
    for (let i = 0; i < knurlCount; i++) {
      const a = (i / knurlCount) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * ringR, Math.sin(a) * ringR, -0.72);
      dummy.rotation.set(0, 0, a);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [knurlCount]);

  useLayoutEffect(() => {
    const mesh = tickRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const ringR = 2.52;
    for (let i = 0; i < tickCount; i++) {
      const a = (i / tickCount) * Math.PI * 2;
      // every 6th tick is longer (a major index mark)
      const major = i % 6 === 0;
      dummy.position.set(Math.cos(a) * ringR, Math.sin(a) * ringR, 0.14);
      dummy.rotation.set(0, 0, a);
      dummy.scale.set(1, major ? 1.9 : 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [tickCount]);

  return (
    <group>
      {/* tapered barrel giving the lens real depth */}
      <mesh position={[0, 0, -0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.9, 3.08, 1.1, seg, 1, true]} />
        <meshStandardMaterial
          color={palette.charcoal}
          metalness={0.92}
          roughness={0.42}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* knurled focus-ring ridges (instanced) */}
      <instancedMesh
        ref={knurlRef}
        args={[undefined, undefined, knurlCount]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.06, 0.16, 0.62]} />
        <meshStandardMaterial
          color={palette.silverDim}
          metalness={1}
          roughness={0.34}
        />
      </instancedMesh>

      {/* clear-coated glass element behind the iris */}
      <mesh position={[0, 0, -0.46]}>
        <circleGeometry args={[2.0, seg]} />
        <meshPhysicalMaterial
          color={"#070b16"}
          metalness={0}
          roughness={0.06}
          clearcoat={1}
          clearcoatRoughness={0.08}
          reflectivity={0.6}
          envMapIntensity={1.6}
          emissive={palette.blue}
          emissiveIntensity={0.03}
        />
      </mesh>

      {/* charcoal lens FACE — sits in front of the blades and masks their outer
          ends so the aperture reads as a clean circle no matter the twist */}
      <mesh position={[0, 0, 0.06]}>
        <ringGeometry args={[1.97, 2.62, seg]} />
        <meshStandardMaterial
          color={palette.charcoal}
          metalness={0.75}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* engraved index ticks on the face */}
      <instancedMesh
        ref={tickRef}
        args={[undefined, undefined, tickCount]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.012, 0.07, 0.01]} />
        <meshStandardMaterial
          color={palette.silver}
          metalness={1}
          roughness={0.4}
        />
      </instancedMesh>

      {/* thin red accent ring (brand pop) */}
      <mesh position={[0, 0, 0.13]}>
        <torusGeometry args={[2.34, 0.02, 16, seg]} />
        <meshStandardMaterial
          color={palette.red}
          metalness={0.6}
          roughness={0.3}
          emissive={palette.red}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* inner silver ring framing the iris (crisp edge) */}
      <mesh position={[0, 0, 0.13]}>
        <torusGeometry args={[1.99, 0.05, 20, seg]} />
        <meshStandardMaterial
          color={palette.silver}
          metalness={1}
          roughness={0.18}
        />
      </mesh>

      {/* outer polished silver bezel */}
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[2.78, 0.08, 24, seg]} />
        <meshStandardMaterial
          color={palette.silver}
          metalness={1}
          roughness={0.18}
        />
      </mesh>
    </group>
  );
}
