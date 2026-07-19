"use client";

import { useLanguage } from "@/lib/i18n";

export default function SoftwarePanel() {
  const { t } = useLanguage();
  return (
    <div className="pointer-events-none flex min-h-[100svh] w-full items-end justify-end p-6 sm:p-14">
      <div className="max-w-md text-right">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-logo-blue/90">
          {t.softwareKicker}
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-[1.1] tracking-tight text-white sm:mt-4 sm:text-5xl">
          {t.softwareHeading}
        </h2>
        {/* descriptive copy hidden on phones — it would overlap the 3D terminal */}
        <p className="mt-5 hidden text-base leading-7 text-silver/75 sm:block">
          {t.softwareBody}
        </p>
        <ul className="mt-4 flex flex-wrap justify-end gap-2 sm:mt-7">
          {t.softwareTags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-logo-blue/30 bg-logo-blue/5 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-logo-blue/90"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
