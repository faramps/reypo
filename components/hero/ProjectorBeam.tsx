"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  projection,
  BEAM_R0,
  BEAM_A,
  BEAM_B,
  BEAM_START,
  BEAM_LEN,
} from "@/lib/projection";
import { createGlowTexture } from "./glowTexture";

/**
 * Open frustum from the lens exit pupil (circle, r=BEAM_R0) to an ellipse just
 * larger than the screen. Built along local +Z so the group can simply adopt
 * the lens quaternion (the lens face is its +Z).
 */
function makeBeamGeometry(radial: number, rings: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const z = THREE.MathUtils.lerp(BEAM_START, BEAM_LEN, t);
    const a = THREE.MathUtils.lerp(BEAM_R0, BEAM_A, t);
    const b = THREE.MathUtils.lerp(BEAM_R0, BEAM_B, t);
    for (let i = 0; i <= radial; i++) {
      const th = (i / radial) * Math.PI * 2;
      positions.push(Math.cos(th) * a, Math.sin(th) * b, z);
      uvs.push(i / radial, t);
    }
  }
  const stride = radial + 1;
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < radial; i++) {
      const a0 = r * stride + i;
      const b0 = a0 + stride;
      indices.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const BEAM_VERT = /* glsl */ `
  varying float vT;
  varying float vU;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vT = uv.y;
    vU = uv.x;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFade;
  uniform float uTime;
  varying float vT;
  varying float vU;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // Silhouette edges glow like a real volumetric cone. Brightest at the lamp,
    // falling off toward the screen so the projected picture stays clean.
    float edge = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.7);
    float body = 0.05;
    float along = mix(1.0, 0.26, vT);              // hot at lamp → dim at screen
    float cap = smoothstep(0.11, 0.0, vT) * 0.9;   // hot burst at the exit pupil
    // slowly counter-rotating shafts — the "rays" inside the cone
    float rays = 0.7
      + 0.2 * sin(vU * 6.2832 * 9.0 + uTime * 0.55)
      + 0.1 * sin(vU * 6.2832 * 17.0 - uTime * 0.35);
    float flicker = 0.94 + 0.06 * sin(uTime * 23.0) * sin(uTime * 7.3 + 1.7);
    float a = ((body + edge * 0.55) * along * rays + cap) * uFade * flicker;
    // HDR-boost the core so the bloom catches it as real light, not grey haze
    vec3 col = uColor * (1.0 + 1.1 * cap + 0.35 * edge);
    gl_FragColor = vec4(col, a * 1.15);
  }
`;

const DUST_COUNT = 140;

/** t (0..1 along beam), theta, radius fraction — per dust mote. */
function makeDustParams(): Float32Array {
  const params = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    params[i * 3] = 0.05 + Math.random() * 0.95;
    params[i * 3 + 1] = Math.random() * Math.PI * 2;
    params[i * 3 + 2] = Math.pow(Math.random(), 0.6) * 0.85;
  }
  return params;
}

function writeDustPositions(params: Float32Array, out: Float32Array) {
  for (let i = 0; i < DUST_COUNT; i++) {
    const t = params[i * 3];
    const th = params[i * 3 + 1];
    const rf = params[i * 3 + 2];
    out[i * 3] = Math.cos(th) * THREE.MathUtils.lerp(BEAM_R0, BEAM_A, t) * rf;
    out[i * 3 + 1] = Math.sin(th) * THREE.MathUtils.lerp(BEAM_R0, BEAM_B, t) * rf;
    out[i * 3 + 2] = THREE.MathUtils.lerp(BEAM_START, BEAM_LEN, t);
  }
}

type Props = { highQuality: boolean };

/**
 * The projector's light: an additive volumetric cone glued to the lens pose
 * published by StageRig, a lamp flare sprite at the exit pupil, and (high tier)
 * slow dust motes drifting toward the screen. Everything fades with
 * `projection.fade`, and the whole group is hidden outside the act so it costs
 * no fill rate during the hero or software acts.
 */
export default function ProjectorBeam({ highQuality }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const beamMatRef = useRef<THREE.ShaderMaterial>(null);
  const dustRef = useRef<THREE.Points>(null);
  const dustMatRef = useRef<THREE.PointsMaterial>(null);
  const flareMatRef = useRef<THREE.SpriteMaterial>(null);
  const mouthMatRef = useRef<THREE.SpriteMaterial>(null);
  // Dust drift state lives in a ref (seeded on the first frame) so the render
  // stays pure — the react-hooks rules forbid mutating useMemo results.
  const dustParamsRef = useRef<Float32Array | null>(null);

  const beamGeo = useMemo(
    () => makeBeamGeometry(highQuality ? 64 : 36, 8),
    [highQuality],
  );
  useEffect(() => () => beamGeo.dispose(), [beamGeo]);

  const beamUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color("#a9caff") },
      uFade: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  const flareTex = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => flareTex.dispose(), [flareTex]);

  // Motes start collapsed at the origin; the first visible frame lays them out.
  const dustGeo = useMemo(() => {
    if (!highQuality) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(DUST_COUNT * 3), 3),
    );
    return geo;
  }, [highQuality]);
  useEffect(() => () => dustGeo?.dispose(), [dustGeo]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const fade = projection.fade;
    g.visible = fade > 0.004;
    if (!g.visible) return;

    g.position.copy(projection.lensPos);
    g.quaternion.copy(projection.lensQuat);
    // shorter, tighter cone for the near software throw; long for the video one
    g.scale.setScalar(projection.beamScale);
    if (beamMatRef.current) {
      beamMatRef.current.uniforms.uFade.value = fade;
      beamMatRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (flareMatRef.current) flareMatRef.current.opacity = fade;
    if (mouthMatRef.current) mouthMatRef.current.opacity = 0.55 * fade;

    const dust = dustRef.current;
    if (dust && dustMatRef.current) {
      if (!dustParamsRef.current) dustParamsRef.current = makeDustParams();
      const params = dustParamsRef.current;
      // motes drift slowly toward the screen and wrap back to the lamp
      for (let i = 0; i < DUST_COUNT; i++) {
        let t = params[i * 3] + delta * 0.03;
        if (t > 1) t = 0.05;
        params[i * 3] = t;
      }
      const attr = dust.geometry.attributes.position as THREE.BufferAttribute;
      writeDustPositions(params, attr.array as Float32Array);
      attr.needsUpdate = true;
      dustMatRef.current.opacity = 0.9 * fade;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh geometry={beamGeo}>
        <shaderMaterial
          ref={beamMatRef}
          vertexShader={BEAM_VERT}
          fragmentShader={BEAM_FRAG}
          uniforms={beamUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* lamp flare at the exit pupil */}
      <sprite position={[0, 0, BEAM_START + 0.05]} scale={[2.2, 2.2, 1]}>
        <spriteMaterial
          ref={flareMatRef}
          map={flareTex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </sprite>

      {/* glow disc at the beam's far mouth — the cone's fresnel shading
          collapses when viewed straight down the axis (exactly the projector's
          money shot), so this camera-facing billboard guarantees the "light
          hitting the screen" glow; its centre hides behind the DOM picture
          and the rim spills around it */}
      <sprite position={[0, 0, BEAM_LEN]} scale={[BEAM_A * 2.6, BEAM_B * 2.6, 1]}>
        <spriteMaterial
          ref={mouthMatRef}
          map={flareTex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </sprite>

      {dustGeo && (
        <points ref={dustRef} geometry={dustGeo} frustumCulled={false}>
          <pointsMaterial
            ref={dustMatRef}
            size={0.07}
            color="#e6eeff"
            transparent
            opacity={0}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </points>
      )}
    </group>
  );
}
