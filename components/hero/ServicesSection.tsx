"use client";

import { useLanguage } from "@/lib/i18n";
import ServiceCard from "./ServiceCard";

export default function ServicesSection() {
  const { t } = useLanguage();

  const card = (i: number) => (
    <ServiceCard
      index={i}
      title={t.services[i]}
      description={t.serviceDescriptions[i]}
    />
  );

  return (
    <section className="pointer-events-none relative flex min-h-[100svh] flex-col justify-center px-6 py-28 sm:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="services-reveal mb-16 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-silver/50">
            {t.servicesKicker}
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            {t.servicesHeading}
          </h2>
        </header>

        {/* left + right card columns frame the central eye-portal */}
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_minmax(260px,400px)_1fr]">
          <div className="flex flex-col gap-6">
            {card(0)}
            {card(2)}
          </div>
          <div aria-hidden className="hidden lg:block" />
          <div className="flex flex-col gap-6">
            {card(1)}
            {card(3)}
          </div>
        </div>
      </div>
    </section>
  );
}
