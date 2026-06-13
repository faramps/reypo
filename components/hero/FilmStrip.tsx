"use client";

import { useMemo } from "react";
import { palette } from "@/lib/palette";

type Props = {
  /** start point [x,y,z] */
  a: [number, number, number];
  /** end point [x,y,z] (shares z with a) */
  b: [number, number, number];
  /** how high the strip arcs above the two ends */
  lift: number;
  count: number;
};

/**
 * A short film strip of individual frames arcing along a quadratic curve —
 * threads over the top between the two reels so the camera reads as a real film
 * camera. Static (the slack loop); the reels do the spinning.
 */
export default function FilmStrip({ a, b, lift, count }: Props) {
  const frames = useMemo(() => {
    const [ax, ay] = a;
    const [bx, by] = b;
    const cx = (ax + bx) / 2;
    const cy = Math.max(ay, by) + lift;
    const out: { x: number; y: number; ang: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const mt = 1 - t;
      const x = mt * mt * ax + 2 * mt * t * cx + t * t * bx;
      const y = mt * mt * ay + 2 * mt * t * cy + t * t * by;
      const dx = 2 * mt * (cx - ax) + 2 * t * (bx - cx);
      const dy = 2 * mt * (cy - ay) + 2 * t * (by - cy);
      out.push({ x, y, ang: Math.atan2(dy, dx) });
    }
    return out;
  }, [a, b, lift, count]);

  return (
    <group>
      {frames.map((f, i) => (
        <group key={i} position={[f.x, f.y, a[2]]} rotation={[0, 0, f.ang]}>
          {/* film base */}
          <mesh>
            <boxGeometry args={[0.26, 0.5, 0.05]} />
            <meshStandardMaterial color="#0b0d13" metalness={0.4} roughness={0.7} />
          </mesh>
          {/* frame image area */}
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.17, 0.3, 0.02]} />
            <meshStandardMaterial
              color={palette.charcoalLight}
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
          {/* sprocket edges */}
          <mesh position={[0, 0.21, 0.03]}>
            <boxGeometry args={[0.22, 0.04, 0.02]} />
            <meshStandardMaterial color={palette.silverDim} metalness={0.9} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.21, 0.03]}>
            <boxGeometry args={[0.22, 0.04, 0.02]} />
            <meshStandardMaterial color={palette.silverDim} metalness={0.9} roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
