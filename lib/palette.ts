/**
 * Single source of truth for the reypo logo palette.
 * Consumed by both Three.js materials (hex strings) and Tailwind/CSS tokens
 * (mirrored in app/globals.css @theme).
 */
export const palette = {
  /** Near-black canvas / page background. */
  backgroundDeep: "#04050a",
  background: "#070910",
  /** Charcoal greys for surfaces. */
  charcoal: "#0e1116",
  charcoalLight: "#161a22",

  /** Logo red — aperture blades. */
  red: "#e8232b",
  redGlow: "#ff2d36",

  /** Logo blue — the pupil. */
  blue: "#2440e6",
  blueGlow: "#3b6bff",

  /** Metallic silver / grey accents. */
  silver: "#c8cdd6",
  silverDim: "#8b93a1",
  grey: "#5b6270",

  white: "#f4f6fb",
} as const;

export type Palette = typeof palette;
