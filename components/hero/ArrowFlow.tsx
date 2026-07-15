"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scrollStore";
import { band } from "@/lib/projection";

/** Small glowing chevron/arrow sprite, pointing +X, transparent padding. */
function createArrowTexture(): THREE.CanvasTexture {
  const s = 128;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = "#dfe8ff";
  ctx.shadowColor = "rgba(150,180,255,0.9)";
  ctx.shadowBlur = 14;
  // arrow: shaft + head, drawn within the inner ~70% so rotation never clips
  ctx.beginPath();
  ctx.moveTo(-34, -7);
  ctx.lineTo(8, -7);
  ctx.lineTo(8, -18);
  ctx.lineTo(38, 0);
  ctx.lineTo(8, 18);
  ctx.lineTo(8, 7);
  ctx.lineTo(-34, 7);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

const VERT = /* glsl */ `
  attribute float aAngle;
  attribute float aSize;
  attribute float aFade;
  varying float vAngle;
  varying float vFade;
  void main() {
    vAngle = aAngle;
    vFade = aFade;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (240.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uOpacity;
  varying float vAngle;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vAngle);
    float co = cos(vAngle);
    vec2 r = vec2(c.x * co + c.y * s, -c.x * s + c.y * co) + 0.5;
    vec4 tex = texture2D(uTex, r);
    gl_FragColor = vec4(tex.rgb, tex.a * uOpacity * vFade);
  }
`;

type Props = { highQuality: boolean };

/**
 * The background particles "become arrows" for the works act: a stream of
 * glowing chevrons that spawn at the frame edges and fly toward the video
 * wall, each rotated along its own flight direction (per-point angle in the
 * shader). Fades in as the constellation dots fade down, so it reads as the
 * particles transforming. Hidden outside the act — zero cost elsewhere.
 */
export default function ArrowFlow({ highQuality }: Props) {
  const COUNT = highQuality ? 96 : 48;
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  // per-particle state: pos(3) + velocity(3) lives in refs, seeded lazily
  const stateRef = useRef<{ pos: Float32Array; vel: Float32Array } | null>(null);

  const tex = useMemo(() => createArrowTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    g.setAttribute("aAngle", new THREE.BufferAttribute(new Float32Array(COUNT), 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(COUNT).fill(1), 1));
    g.setAttribute("aFade", new THREE.BufferAttribute(new Float32Array(COUNT), 1));
    return g;
  }, [COUNT]);
  useEffect(() => () => geo.dispose(), [geo]);

  const uniforms = useMemo(
    () => ({ uTex: { value: tex }, uOpacity: { value: 0 } }),
    [tex],
  );

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    const mat = matRef.current;
    if (!pts || !mat) return;
    const p = scroll.progress;
    const w = band(p, 0.14, 0.28, 0.52, 0.6);
    pts.visible = w > 0.01;
    mat.uniforms.uOpacity.value = 0.85 * w;
    if (!pts.visible) return;

    // lazy seed
    if (!stateRef.current) {
      const pos = new Float32Array(COUNT * 3);
      const vel = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) spawn(pos, vel, i, true);
      stateRef.current = { pos, vel };
    }
    const { pos, vel } = stateRef.current;
    const aPos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const aAngle = pts.geometry.attributes.aAngle as THREE.BufferAttribute;
    const aSize = pts.geometry.attributes.aSize as THREE.BufferAttribute;
    const aFade = pts.geometry.attributes.aFade as THREE.BufferAttribute;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      pos[i3] += vel[i3] * delta;
      pos[i3 + 1] += vel[i3 + 1] * delta;
      pos[i3 + 2] += vel[i3 + 2] * delta;
      // arrived near the wall plane → respawn at an edge
      const dx = pos[i3];
      const dy = pos[i3 + 1] - 0.4;
      if (Math.abs(dx) < 1.1 && Math.abs(dy) < 0.9) spawn(pos, vel, i, false);

      (aPos.array as Float32Array)[i3] = pos[i3];
      (aPos.array as Float32Array)[i3 + 1] = pos[i3 + 1];
      (aPos.array as Float32Array)[i3 + 2] = pos[i3 + 2];
      // rotate the sprite along its (screen-space, camera is frontal) heading
      (aAngle.array as Float32Array)[i] = Math.atan2(vel[i3 + 1], vel[i3]);
      // fade near spawn and near arrival
      const dist = Math.hypot(dx, dy);
      (aFade.array as Float32Array)[i] = Math.min(1, Math.max(0.15, dist / 4 - 0.1));
      (aSize.array as Float32Array)[i] = 0.9 + 0.35 * Math.sin(i * 7.31);
    }
    aPos.needsUpdate = true;
    aAngle.needsUpdate = true;
    aFade.needsUpdate = true;
    aSize.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geo} frustumCulled={false} visible={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Spawn particle `i` at a frame edge, aimed at the video wall centre. */
function spawn(pos: Float32Array, vel: Float32Array, i: number, scatter: boolean) {
  const i3 = i * 3;
  const side = Math.random();
  // edges: left / right / top / bottom, biased to the sides
  let x: number;
  let y: number;
  if (side < 0.36) {
    x = -9 - Math.random() * 3;
    y = -2.5 + Math.random() * 6;
  } else if (side < 0.72) {
    x = 9 + Math.random() * 3;
    y = -2.5 + Math.random() * 6;
  } else if (side < 0.86) {
    x = -7 + Math.random() * 14;
    y = 4.2 + Math.random() * 2;
  } else {
    x = -7 + Math.random() * 14;
    y = -3.6 - Math.random() * 2;
  }
  const z = -2.5 + Math.random() * 3.5;
  // scatter the initial seed along the flight path so the stream starts full
  const t = scatter ? Math.random() * 0.8 : 0;
  const tx = (Math.random() - 0.5) * 5;
  const ty = 0.4 + (Math.random() - 0.5) * 2;
  pos[i3] = THREE.MathUtils.lerp(x, tx, t);
  pos[i3 + 1] = THREE.MathUtils.lerp(y, ty, t);
  pos[i3 + 2] = z;
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 2.2 + Math.random() * 1.6;
  vel[i3] = (dx / len) * speed;
  vel[i3 + 1] = (dy / len) * speed;
  vel[i3 + 2] = 0;
}
