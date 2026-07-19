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
export const CONTACT_EMAIL = "destek@reypo.com.tr";

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
 * each clip (a 9:16 vertical reel gets a tall portrait frame — rendered larger
 * than a landscape one — morphing during the crossfade), and the side-panel
 * cards take each clip's own shape (no filler bands).
 *
 * Set the array to `[]` (or a clip's `src` to "") to force the placeholder.
 * Use ASCII file names (no Turkish characters) so URLs survive every host.
 */
export type ShowreelClip = {
  /**
   * Primary source: the clip's HLS master playlist (.m3u8). Adaptive bitrate —
   * slow/mobile connections get a lower rendition and start faster. Played via
   * hls.js (Chrome/Firefox/Android) or natively (Safari). ProjectionOverlay
   * falls back to `mp4` if the playlist is missing or errors, so the site keeps
   * working before the HLS files are encoded/uploaded.
   */
  src: string;
  /** Progressive MP4 fallback (reduced-motion DOM reel + no-MSE browsers). */
  mp4: string;
  poster?: string;
};

// Videolar bir CDN'de (R2) barındırılır. Yerelde env boşsa public/videos/web
// kullanılır. Yayında NEXT_PUBLIC_MEDIA_BASE_URL bir CUSTOM DOMAIN olmalı
// (ör. https://media.reypo.com) — Cloudflare CORS politikası yalnızca custom
// domain'de uygulanır; pub-*.r2.dev URL'i CORS döndürmez, o yüzden HLS (hls.js
// fetch) ve WebGL kapakları r2.dev üzerinde çalışmaz. Dosya adları R2'de de aynı.
// `||` (not `??`): boş string ("NEXT_PUBLIC_MEDIA_BASE_URL=") de yerel yola
// düşmeli — `??` yalnızca null/undefined'ı yakalar, boş string'i olduğu gibi
// bırakıp yolları site köküne (/kocaeli.mp4) kaydırırdı.
const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "/videos/web").replace(/\/+$/, "");

// R2 düzeni:  <ad>.mp4  <ad>.jpg  (kök)   ve   hls/<ad>/master.m3u8
const clip = (name: string): ShowreelClip => ({
  src: `${MEDIA_BASE}/hls/${name}/master.m3u8`,
  mp4: `${MEDIA_BASE}/${name}.mp4`,
  poster: `${MEDIA_BASE}/${name}.jpg`,
});

export const SHOWREEL_CLIPS: ShowreelClip[] = [
  clip("kocaeli"),
  clip("kizilay-camlik"), // dikey 9:16
  clip("musiad"),
  clip("vinc"), // dikey 9:16
];

/**
 * Single-source accessors kept for the reduced-motion DOM fallback
 * (components/hero/Showreel.tsx), which shows just the first clip. It uses the
 * progressive MP4 (a plain <video src>) — no hls.js on the reduced-motion path.
 */
export const SHOWREEL_SRC: string = SHOWREEL_CLIPS[0]?.mp4 ?? "";
export const SHOWREEL_POSTER: string = SHOWREEL_CLIPS[0]?.poster ?? "";
