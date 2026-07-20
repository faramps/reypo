// Proje ve kişilere kalıcı, deterministik renk atar: aynı id her zaman aynı
// rengi alır (id üzerinden hash). Sidebar proje ikonları, kişi avatarları ve
// proje kartı şeritleri bu paleti paylaşır.

export type PaletteEntry = {
  dot: string; // küçük renk noktası
  chip: string; // avatar / yumuşak zeminli rozet
  icon: string; // ikon rengi
  accent: string; // kart sol şeridi (border-l-*)
};

const palette: PaletteEntry[] = [
  {
    dot: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-700",
    icon: "text-indigo-500",
    accent: "border-l-indigo-400",
  },
  {
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-700",
    icon: "text-sky-500",
    accent: "border-l-sky-400",
  },
  {
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700",
    icon: "text-emerald-500",
    accent: "border-l-emerald-400",
  },
  {
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800",
    icon: "text-amber-500",
    accent: "border-l-amber-400",
  },
  {
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
    icon: "text-rose-500",
    accent: "border-l-rose-400",
  },
  {
    dot: "bg-violet-500",
    chip: "bg-violet-100 text-violet-700",
    icon: "text-violet-500",
    accent: "border-l-violet-400",
  },
  {
    dot: "bg-teal-500",
    chip: "bg-teal-100 text-teal-700",
    icon: "text-teal-500",
    accent: "border-l-teal-400",
  },
  {
    dot: "bg-orange-500",
    chip: "bg-orange-100 text-orange-800",
    icon: "text-orange-500",
    accent: "border-l-orange-400",
  },
];

export function colorFor(key: string | null | undefined): PaletteEntry {
  if (!key) return palette[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}
