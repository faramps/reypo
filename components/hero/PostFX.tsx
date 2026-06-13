"use client";

import type { ReactElement } from "react";
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

type Props = {
  /** Subtle depth-of-field, focused on the eye. Off on low tier / reduced motion. */
  enableDOF: boolean;
  /** High tier enables MSAA for cleaner edges. */
  highQuality: boolean;
};

/**
 * Cinematic post stack. DOF is kept gentle and focused on the eye (target at
 * origin) so the background constellations stay legible; grain is very light to
 * avoid the noisy patches heavy bokeh used to produce on tilted blades.
 */
export default function PostFX({ enableDOF, highQuality }: Props) {
  const effects = [
    <Bloom
      key="bloom"
      intensity={0.55}
      luminanceThreshold={0.45}
      luminanceSmoothing={0.3}
      mipmapBlur
    />,
    enableDOF ? (
      <DepthOfField
        key="dof"
        target={[0, 0, 0]}
        focusRange={0.2}
        bokehScale={1.7}
      />
    ) : null,
    <Vignette key="vignette" eskil={false} offset={0.32} darkness={0.62} />,
    <Noise
      key="noise"
      premultiply
      blendFunction={BlendFunction.OVERLAY}
      opacity={0.05}
    />,
  ].filter((e): e is ReactElement => e !== null);

  return (
    <EffectComposer multisampling={highQuality ? 4 : 0}>{effects}</EffectComposer>
  );
}
