/**
 * Quality tiering for the WebGL stage.
 *
 * The cinematic scene (clearcoat metals, an environment cubemap, and a full
 * post stack) is expensive to *compile* on first load and expensive to *fill*
 * every frame. On weak GPUs that combination is what made the scene take ~15s
 * to appear, or never appear on slow phones. We pick a tier up-front from cheap,
 * synchronous device signals so a weak device never even attempts the heavy
 * path; `PerformanceMonitor` can still downgrade later if we guessed too high.
 */
export type Tier = "high" | "low";

type NavigatorWithHints = Navigator & {
  /** Chrome-only: approximate device RAM in GB, capped at 8. */
  deviceMemory?: number;
};

/**
 * Cheap, synchronous probe of device capability. Safe to call from a
 * `useState` initializer — it only runs on the client (the canvas is
 * `ssr:false`) and never creates a throwaway WebGL context.
 */
export function detectTier(): Tier {
  // SSR guard — should never run on the server, but keep it total.
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "high";
  }

  const mq = (q: string) => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };

  // Explicit "go easy" signals from the user / OS.
  if (mq("(prefers-reduced-data: reduce)")) return "low";

  const nav = navigator as NavigatorWithHints;
  const mem = nav.deviceMemory; // GB, Chrome only (undefined elsewhere)
  const cores = nav.hardwareConcurrency ?? 8;

  // Low RAM or few logical cores → treat as weak regardless of form factor.
  if (typeof mem === "number" && mem <= 4) return "low";
  if (cores <= 4) return "low";

  // Touch-first / small viewports (phones, most tablets) — the heavy fill rate
  // of the post stack at devicePixelRatio is the main killer here.
  if (mq("(pointer: coarse)") || mq("(max-width: 900px)")) return "low";

  return "high";
}
