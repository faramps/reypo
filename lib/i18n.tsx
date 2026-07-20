"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type Lang = "tr" | "en";

export type Dict = {
  /** Small eyebrow above the headline. */
  kicker: string;
  /** Headline split into three parts so the middle word can glow. */
  headlineLead: string;
  headlineHighlight: string;
  headlineTail: string;
  sub: string;
  cta: string;
  scrollHint: string;
  /** Status line shown in the HUD corner. */
  status: string;
  /** Service labels orbiting the experience (used now + future sections). */
  services: string[];
  langLabel: string;
  /** Top-bar "sign in" link → the internal Görev Takip app. */
  loginLabel: string;

  /** Services section. */
  servicesKicker: string;
  servicesHeading: string;
  /** Short descriptions, parallel to `services`. */
  serviceDescriptions: string[];

  /** Video / creative arm panel. */
  videoKicker: string;
  videoHeading: string;
  videoBody: string;
  /** Capability chips for the creative arm. */
  videoTags: string[];
  /** 3D headline that opens the works/video act (rendered in-scene). */
  worksTitle: string;

  /** Software arm panel. */
  softwareKicker: string;
  softwareHeading: string;
  softwareBody: string;
  /** Capability chips for the software arm. */
  softwareTags: string[];

  /** Showreel player. */
  showreel: {
    label: string;
  };
  /** Projection screen sound toggle. */
  soundOn: string;
  soundOff: string;

  /** Outro / CTA section. */
  outroKicker: string;
  outroHeading: string;
  outroSub: string;

  /** Contact modal. */
  contact: {
    navLabel: string;
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    submit: string;
    successTitle: string;
    successBody: string;
    close: string;
    orEmail: string;
    errRequired: string;
    errEmail: string;
    mailSubject: string;
  };
};

export const dictionaries: Record<Lang, Dict> = {
  tr: {
    kicker: "YAZILIM × KREATİF STÜDYO",
    headlineLead: "Vizyonu",
    headlineHighlight: "odağa",
    headlineTail: "getiriyoruz.",
    sub: "Sıradanlığı reddeden markalar için immersif web, kreatif motion ve akıllı sistemler.",
    cta: "Projeyi başlat",
    scrollHint: "Keşfetmek için kaydır",
    status: "GÖRÜ KONTROL MERKEZİ — ÇEVRİMİÇİ",
    services: ["Kreatif Motion", "İmmersif Web", "Marka Stratejisi", "Yapay Zeka"],
    langLabel: "TR",
    loginLabel: "Giriş Yap",
    servicesKicker: "YETKİNLİKLER",
    servicesHeading: "Tek bir merceğe odaklanmış disiplinler.",
    serviceDescriptions: [
      "Markaları hareket ettiren motion tasarım, 3D ve jenerik sekansları.",
      "İnsanı içine çeken WebGL, gerçek-zamanlı 3D ve etkileşimli deneyimler.",
      "Bakış açısı olan konumlandırma, kimlik sistemleri ve marka anlatıları.",
      "Ürününüze entegre LLM destekli özellikler, ajanlar ve veri hatları.",
    ],
    videoKicker: "KREATİF & VİDEO",
    videoHeading: "Işığı kaydeden taraf.",
    videoBody:
      "Motion tasarım, 3D ve film prodüksiyonu. Markanızın hikâyesini kareye çeken kreatif kol — makaralar dönmeye devam ediyor.",
    videoTags: ["Motion", "3D", "Film", "Renk"],
    worksTitle: "SEÇİLİ İŞLER",
    softwareKicker: "YAZILIM & SİSTEMLER",
    softwareHeading: "Vizyonu koda çeviren taraf.",
    softwareBody:
      "İmmersif web, gerçek-zamanlı 3D ve yapay zekâ. Fikri çalışan ürüne dönüştüren mühendislik kolu — kod akmaya devam ediyor.",
    softwareTags: ["WebGL", "AI", "Gerçek-zaman", "Bulut"],
    outroKicker: "BİR SONRAKİ KARE",
    outroHeading: "Farklı gören bir şey inşa edelim.",
    outroSub: "Bir fikriniz mi var, yoksa sadece merceği mi büküyorsunuz — konuşalım.",
    contact: {
      navLabel: "İletişim",
      title: "Bir proje konuşalım.",
      subtitle: "Fikrinizi anlatın; 1–2 iş günü içinde size dönelim.",
      nameLabel: "Ad",
      namePlaceholder: "Adınız",
      emailLabel: "E-posta",
      emailPlaceholder: "siz@ornek.com",
      messageLabel: "Mesaj",
      messagePlaceholder: "Aklınızdaki projeden kısaca bahsedin…",
      submit: "Gönder",
      successTitle: "E-posta uygulamanız açıldı.",
      successBody: "Açılmadıysa doğrudan bize yazabilirsiniz:",
      close: "Kapat",
      orEmail: "ya da doğrudan:",
      errRequired: "Bu alan gerekli.",
      errEmail: "Geçerli bir e-posta girin.",
      mailSubject: "Yeni proje talebi — reypo",
    },
    showreel: {
      label: "SHOWREEL",
    },
    soundOn: "SES AÇIK",
    soundOff: "SES KAPALI",
  },
  en: {
    kicker: "SOFTWARE × CREATIVE STUDIO",
    headlineLead: "We bring",
    headlineHighlight: "vision",
    headlineTail: "into focus.",
    sub: "Immersive web, creative motion, and intelligent systems for brands that refuse to blend in.",
    cta: "Start a project",
    scrollHint: "Scroll to explore",
    status: "VISION CONTROL CENTER — ONLINE",
    services: ["Creative Motion", "Immersive Web", "Brand Strategy", "AI Integration"],
    langLabel: "EN",
    loginLabel: "Sign in",
    servicesKicker: "CAPABILITIES",
    servicesHeading: "Disciplines focused through a single lens.",
    serviceDescriptions: [
      "Motion design, 3D and title sequences that make brands move.",
      "WebGL, real-time 3D and interactive experiences that pull people in.",
      "Positioning, identity systems and brand narratives with a point of view.",
      "LLM-powered features, agents and data pipelines wired into your product.",
    ],
    videoKicker: "CREATIVE & VIDEO",
    videoHeading: "The side that records light.",
    videoBody:
      "Motion design, 3D and film production — the creative arm that captures your story frame by frame, reels still turning.",
    videoTags: ["Motion", "3D", "Film", "Color"],
    worksTitle: "SELECTED WORKS",
    softwareKicker: "SOFTWARE & SYSTEMS",
    softwareHeading: "The side that turns vision into code.",
    softwareBody:
      "Immersive web, real-time 3D and AI — the engineering arm that ships the idea as a working product, code still flowing.",
    softwareTags: ["WebGL", "AI", "Realtime", "Cloud"],
    outroKicker: "NEXT FRAME",
    outroHeading: "Let's build something that sees differently.",
    outroSub: "Got an idea, or just bending the lens — either way, let's talk.",
    contact: {
      navLabel: "Contact",
      title: "Let's talk about a project.",
      subtitle: "Tell us the idea — we'll get back within 1–2 business days.",
      nameLabel: "Name",
      namePlaceholder: "Your name",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      messageLabel: "Message",
      messagePlaceholder: "Briefly describe the project you have in mind…",
      submit: "Send",
      successTitle: "Your email app should have opened.",
      successBody: "If it didn't, you can write to us directly:",
      close: "Close",
      orEmail: "or directly:",
      errRequired: "This field is required.",
      errEmail: "Enter a valid email.",
      mailSubject: "New project inquiry — reypo",
    },
    showreel: {
      label: "SHOWREEL",
    },
    soundOn: "SOUND ON",
    soundOff: "SOUND OFF",
  },
};

type LanguageContextValue = {
  lang: Lang;
  t: Dict;
  setLang: (lang: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  defaultLang = "tr",
}: {
  children: ReactNode;
  defaultLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(defaultLang);

  const toggle = useCallback(
    () => setLang((prev) => (prev === "tr" ? "en" : "tr")),
    [],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, t: dictionaries[lang], setLang, toggle }),
    [lang, toggle],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a <LanguageProvider>");
  }
  return ctx;
}
