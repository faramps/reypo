import type { CSSProperties } from "react";
import { palette } from "@/lib/palette";

type Props = {
  index: number;
  title: string;
  description: string;
};

/**
 * Glassmorphism service card. The outer element is the GSAP scroll-reveal target
 * (it owns the transform); an inner wrapper handles the hover lift so the two
 * transforms never fight.
 */
export default function ServiceCard({ index, title, description }: Props) {
  const accent = index % 2 === 0 ? palette.redGlow : palette.blueGlow;

  return (
    <article
      className="service-card group pointer-events-auto relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.09] to-white/[0.02] shadow-[0_10px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-colors duration-500 hover:border-white/30"
      style={{ "--accent": accent } as CSSProperties}
    >
      {/* top accent hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--accent)] opacity-70" />
      {/* always-on faint accent wash, intensifies on hover */}
      <div
        className="pointer-events-none absolute -inset-24 opacity-[0.07] blur-3xl transition-opacity duration-500 group-hover:opacity-30"
        style={{
          background:
            "radial-gradient(circle at 28% 0%, var(--accent), transparent 60%)",
        }}
      />
      {/* large faint index watermark */}
      <span className="pointer-events-none absolute -right-2 -top-4 select-none font-mono text-8xl font-bold text-white/[0.04]">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative p-8 transition-transform duration-500 group-hover:-translate-y-1.5">
        <span className="flex items-center gap-2 font-mono text-xs tracking-widest text-silver/50">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-6 text-2xl font-semibold tracking-tight text-white">
          {title}
        </h3>
        <p className="mt-3 max-w-xs text-sm leading-6 text-silver/75">
          {description}
        </p>
        <span className="mt-7 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
          reypo
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </article>
  );
}
