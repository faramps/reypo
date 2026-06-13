/**
 * Tiny shared scroll store bridging the DOM (GSAP ScrollTrigger writes here) and
 * the R3F scene (useFrame reads it). Kept as a plain mutable singleton so reads
 * in the render loop never trigger React re-renders.
 *
 * `progress` is 0 at the top of the page and 1 at the bottom.
 */
export const scroll = {
  progress: 0,
};
