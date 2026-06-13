"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { palette } from "@/lib/palette";
import { scroll } from "@/lib/scrollStore";
import ApertureEye from "./ApertureEye";
import Terminal from "./Terminal";
import FilmStrip from "./FilmStrip";

type Props = {
  reducedMotion: boolean;
  highQuality: boolean;
};

/** One side plate of a reel: holed silver disc + rim. */
function ReelPlate({
  z,
  R,
  seg,
  holes,
  withHoles,
}: {
  z: number;
  R: number;
  seg: number;
  holes: number;
  withHoles: boolean;
}) {
  return (
    <group position={[0, 0, z]}>
      <mesh>
        <circleGeometry args={[R, seg]} />
        <meshStandardMaterial
          color={palette.silverDim}
          metalness={0.95}
          roughness={0.36}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[R, 0.07, 14, seg]} />
        <meshStandardMaterial color={palette.silver} metalness={1} roughness={0.24} />
      </mesh>
      {withHoles &&
        Array.from({ length: holes }).map((_, i) => {
          const a = (i / holes) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, 0.02]}
            >
              <circleGeometry args={[R * 0.26, 20]} />
              <meshStandardMaterial color="#0a0c10" metalness={0.3} roughness={0.8} />
            </mesh>
          );
        })}
    </group>
  );
}

/** A film spool: two holed plates with a wound-film cylinder between them. */
function Reel({
  position,
  highQuality,
  speed,
}: {
  position: [number, number, number];
  highQuality: boolean;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const seg = highQuality ? 40 : 20;
  const R = 1.2;
  const width = 0.46;

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed;
  });

  return (
    <group ref={ref} position={position}>
      {/* wound film */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R * 0.8, R * 0.8, width, seg]} />
        <meshStandardMaterial color="#0e1016" metalness={0.45} roughness={0.7} />
      </mesh>
      <ReelPlate z={width / 2 + 0.01} R={R} seg={seg} holes={5} withHoles />
      <ReelPlate z={-width / 2 - 0.01} R={R} seg={seg} holes={5} withHoles={false} />
      {/* hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, width + 0.1, seg]} />
        <meshStandardMaterial color={palette.silver} metalness={1} roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * Stylised old-style reel movie camera (per reference): a boxy body with a lens
 * hood + the detailed aperture as its front lens, two punched film spools on top,
 * a carry handle, viewfinder, crank and REC light — and the live terminal built
 * into the BACK of the body, so camera (video) and terminal (software) are one
 * device. Rotating the rig 180° turns from the lens to the terminal.
 *
 * At scroll 0 only the full-size lens shows (hero); scrolling scales the body in
 * while the lens shrinks + moves forward, "zooming out" to reveal the camera.
 */
export default function ReelCamera({ reducedMotion, highQuality }: Props) {
  const lensRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const reelSpeed = reducedMotion ? 0 : 1.2;

  useFrame((_, delta) => {
    const p = reducedMotion ? 0 : scroll.progress;
    const reveal = THREE.MathUtils.smoothstep(p, 0.04, 0.28);

    if (lensRef.current) {
      const s = THREE.MathUtils.lerp(1, 0.5, reveal);
      lensRef.current.scale.setScalar(
        THREE.MathUtils.damp(lensRef.current.scale.x, s, 5, delta),
      );
      lensRef.current.position.z = THREE.MathUtils.damp(
        lensRef.current.position.z,
        THREE.MathUtils.lerp(0, 0.95, reveal),
        5,
        delta,
      );
    }
    if (bodyRef.current) {
      const bs = THREE.MathUtils.damp(
        bodyRef.current.scale.x,
        Math.max(reveal, 0.0001),
        5,
        delta,
      );
      bodyRef.current.scale.setScalar(bs);
      bodyRef.current.visible = bs > 0.02;
    }
  });

  const metal = () => (
    <meshStandardMaterial color={palette.charcoal} metalness={0.9} roughness={0.42} />
  );

  return (
    <group>
      {/* front lens (the hero aperture) */}
      <group ref={lensRef}>
        <ApertureEye reducedMotion={reducedMotion} highQuality={highQuality} />
      </group>

      {/* camera body + reels + terminal — revealed on scroll */}
      <group ref={bodyRef} scale={0.0001}>
        {/* body */}
        <RoundedBox
          args={[4.2, 2.6, 2.6]}
          radius={0.18}
          smoothness={4}
          position={[0, -0.2, -1.6]}
        >
          <meshStandardMaterial
            color={palette.charcoalLight}
            metalness={0.82}
            roughness={0.42}
          />
        </RoundedBox>

        {/* inset side panel detail */}
        <mesh position={[1.05, -0.2, -0.28]}>
          <boxGeometry args={[1.7, 1.7, 0.04]} />
          <meshStandardMaterial color={palette.charcoal} metalness={0.7} roughness={0.55} />
        </mesh>

        {/* lens hood cone (body front → lens) */}
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.45, 0.95, 1.2, highQuality ? 48 : 24, 1, true]} />
          <meshStandardMaterial
            color={palette.charcoal}
            metalness={0.9}
            roughness={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* polished lens-mount ring */}
        <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.98, 0.08, 16, 48]} />
          <meshStandardMaterial color={palette.silver} metalness={1} roughness={0.22} />
        </mesh>

        {/* two film spools on top */}
        <Reel position={[-0.85, 1.7, 0.3]} highQuality={highQuality} speed={reelSpeed} />
        <Reel position={[0.85, 1.7, 0.3]} highQuality={highQuality} speed={reelSpeed} />
        {/* spool posts */}
        <mesh position={[-0.85, 0.85, 0.3]}>
          <boxGeometry args={[0.18, 1.1, 0.18]} />
          {metal()}
        </mesh>
        <mesh position={[0.85, 0.85, 0.3]}>
          <boxGeometry args={[0.18, 1.1, 0.18]} />
          {metal()}
        </mesh>

        {/* film threaded over the top between the reels */}
        <FilmStrip a={[-0.85, 2.78, 0.34]} b={[0.85, 2.78, 0.34]} lift={0.55} count={14} />

        {/* control dials + nameplate on the visible (+X) face */}
        <mesh position={[2.12, 0.45, -1.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.14, 24]} />
          <meshStandardMaterial color={palette.silverDim} metalness={1} roughness={0.34} />
        </mesh>
        <mesh position={[2.12, -0.7, -2.15]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.14, 24]} />
          <meshStandardMaterial color={palette.silverDim} metalness={1} roughness={0.34} />
        </mesh>
        <mesh position={[2.12, 0.85, -1.65]}>
          <boxGeometry args={[0.05, 0.26, 1.0]} />
          <meshStandardMaterial color={palette.charcoal} metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[2.14, 0.74, -1.65]}>
          <boxGeometry args={[0.03, 0.04, 1.0]} />
          <meshStandardMaterial color={palette.red} emissive={palette.red} emissiveIntensity={0.5} />
        </mesh>

        {/* carry handle (inverted-U on top of the body) */}
        <mesh position={[-0.55, 1.45, -1.6]}>
          <boxGeometry args={[0.14, 0.7, 0.14]} />
          {metal()}
        </mesh>
        <mesh position={[0.55, 1.45, -1.6]}>
          <boxGeometry args={[0.14, 0.7, 0.14]} />
          {metal()}
        </mesh>
        <mesh position={[0, 1.78, -1.6]}>
          <boxGeometry args={[1.3, 0.14, 0.32]} />
          {metal()}
        </mesh>

        {/* viewfinder eyepiece (back-left) */}
        <mesh position={[-1.6, 0.5, -2.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.7, 20]} />
          {metal()}
        </mesh>
        <mesh position={[-1.6, 0.5, -2.78]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.22, 0.18, 20]} />
          <meshStandardMaterial color="#0a0c10" metalness={0.4} roughness={0.7} />
        </mesh>

        {/* REC light */}
        <mesh position={[1.55, 0.95, -0.42]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={palette.red}
            emissive={palette.redGlow}
            emissiveIntensity={2.2}
          />
        </mesh>

        {/* side crank */}
        <mesh position={[2.25, -0.2, -1.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.4, 16]} />
          <meshStandardMaterial color={palette.silverDim} metalness={1} roughness={0.35} />
        </mesh>
        <mesh position={[2.25, -0.55, -1.6]}>
          <boxGeometry args={[0.12, 0.7, 0.12]} />
          <meshStandardMaterial color={palette.silverDim} metalness={1} roughness={0.35} />
        </mesh>

        {/* terminal built into the back of the body (software side) */}
        <group position={[0, -0.2, -2.92]} rotation={[0, Math.PI, 0]} scale={0.52}>
          <Terminal reducedMotion={reducedMotion} />
        </group>
      </group>
    </group>
  );
}
