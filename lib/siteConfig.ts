/**
 * Site-wide configuration constants.
 *
 * CONTACT_EMAIL is where the contact form sends project inquiries (via a
 * prefilled `mailto:`) and the address shown as the "email us directly"
 * fallback. Replace it with your real inbox — this is the single source of
 * truth, used by ContactModal.
 *
 * To move off `mailto:` later (e.g. Resend / Formspree / a Route Handler),
 * change the `submit` handler in components/hero/ContactModal.tsx to POST the
 * form instead; everything else can stay.
 */
export const CONTACT_EMAIL = "merhaba@reypo.com";

/**
 * Showreel clips projected during the creative/video act.
 *
 * Drop your files in `/public` (e.g. `public/showreel.mp4`) and, optionally, a
 * poster image per clip; these paths are served from the site root. Until a
 * file exists the screen shows a film-strip placeholder, so the only step is
 * dropping the file in.
 *
 * Each clip is its own scroll stop inside the video act: scrolling down steps
 * reel → reel on the centre screen (with a crossfade), then leaves the act —
 * the snap points are derived from this list, so adding/removing clips here
 * "just works" (no other code changes). Only the centre reel ever PLAYS (from
 * its start, looping); clips [1] and [2] also appear as still previews on the
 * angled side panels flanking it.
 *
 * Mixed aspect ratios are fine: the centre screen automatically reshapes to
 * each clip (a 9:16 vertical reel gets a tall portrait frame, morphing during
 * the crossfade), and the side-panel stills letterbox over a blurred fill.
 *
 * Set the array to `[]` (or a clip's `src` to "") to force the placeholder.
 * Use ASCII file names (no Turkish characters) so URLs survive every host.
 */
export type ShowreelClip = {
  src: string;
  poster?: string;
};

export const SHOWREEL_CLIPS: ShowreelClip[] = [
  { src: "/showreel.mp4" },
  { src: "/vinc-260326.mp4" },
  { src: "/kobipo-tanitim.mp4" }, // vertical 9:16 — the screen adapts
];

/**
 * Single-source accessors kept for the reduced-motion DOM fallback
 * (components/hero/Showreel.tsx), which shows just the first clip.
 */
export const SHOWREEL_SRC: string = SHOWREEL_CLIPS[0]?.src ?? "";
export const SHOWREEL_POSTER: string = SHOWREEL_CLIPS[0]?.poster ?? "";
