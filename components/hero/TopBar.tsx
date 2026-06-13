"use client";

import LanguageToggle from "./LanguageToggle";

/** Persistent top bar (logo + language toggle), visible across every act. */
export default function TopBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between p-6 sm:p-10">
      <div className="pointer-events-auto select-none text-lg font-semibold lowercase tracking-[0.22em]">
        <span className="text-white">rey</span>
        <span className="text-logo-red">po</span>
      </div>
      <LanguageToggle />
    </div>
  );
}
