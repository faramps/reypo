"use client";

import { useLanguage } from "@/lib/i18n";

export default function SoftwarePanel() {
  const { t } = useLanguage();
  return (
    <div className="pointer-events-none flex min-h-[100svh] w-full items-end justify-end p-8 sm:p-14">
      <div className="max-w-md text-right">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-logo-blue/90">
          {t.softwareKicker}
        </p>
        <h2 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
          {t.softwareHeading}
        </h2>
        <p className="mt-5 text-base leading-7 text-silver/75">
          {t.softwareBody}
        </p>
      </div>
    </div>
  );
}
