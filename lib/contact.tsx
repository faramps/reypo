"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ContactModal from "@/components/hero/ContactModal";

type ContactContextValue = {
  /** Opens the contact modal (wired to every "Start a project" CTA). */
  openContact: () => void;
};

const ContactContext = createContext<ContactContextValue | null>(null);

/**
 * Holds the open/close state for the single shared contact modal and renders it
 * once. Must sit inside <LanguageProvider> (the modal is bilingual). Any
 * descendant can trigger it with `useContact().openContact()`.
 */
export function ContactProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openContact = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openContact }), [openContact]);

  return (
    <ContactContext.Provider value={value}>
      {children}
      {open && <ContactModal onClose={close} />}
    </ContactContext.Provider>
  );
}

export function useContact(): ContactContextValue {
  const ctx = useContext(ContactContext);
  if (!ctx) {
    throw new Error("useContact must be used within a <ContactProvider>");
  }
  return ctx;
}
