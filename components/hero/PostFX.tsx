"use client";

import type { ReactElement } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import type { Tier } from "@/lib/quality";

type Props = {
  /** Quality tier. Low drops grain + MSAA and lightens Bloom. */
  tier: Tier;
};

/**
 * Cinematic post stack: bloom for the emissive glow, a vignette to frame the
 * stage, and (high tier only) a whisper of grain + MSAA.
 *
 * Note: there is deliberately NO depth-of-field. DOF blurs the whole scene off
 * the focal plane, and during the cold-start shader compile that blur lingered
 * for ~12s until PerformanceMonitor downgraded the tier and removed it — it read
 * as a loading defect, not as cinema, so it's gone. Bloom + vignette carry the
 * look at a fraction of the compile/fill cost.
 */
export default function PostFX({ tier }: Props) {
  const highQuality = tier === "high";

  const effects = [
    <Bloom
      key="bloom"
      intensity={highQuality ? 0.55 : 0.4}
      luminanceThreshold={highQuality ? 0.45 : 0.55}
      luminanceSmoothing={0.3}
      mipmapBlur
    />,
    <Vignette key="vignette" eskil={false} offset={0.32} darkness={0.62} />,
    highQuality ? (
      <Noise
        key="noise"
        premultiply
        blendFunction={BlendFunction.OVERLAY}
        opacity={0.05}
      />
    ) : null,
  ].filter((e): e is ReactElement => e !== null);

  return (
    <EffectComposer multisampling={highQuality ? 4 : 0}>{effects}</EffectComposer>
  );
}
