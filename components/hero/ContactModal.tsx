"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/siteConfig";

type Props = {
  /** Called to dismiss. The modal is only mounted while open, so mounting it
   *  gives a fresh form and unmounting runs the cleanup (scroll/focus restore). */
  onClose: () => void;
};

type Errors = { name?: string; email?: string; message?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible, bilingual contact modal wired to every "Start a project" CTA.
 *
 * Submitting opens the visitor's mail client with a prefilled message to
 * CONTACT_EMAIL — a zero-backend path that works the moment the site is
 * deployed. Swap the `submit` handler for a POST to upgrade later. The dialog
 * traps focus, closes on Esc / backdrop click, locks body scroll, and restores
 * focus to the trigger on close.
 */
export default function ContactModal({ onClose }: Props) {
  const { t } = useLanguage();
  const c = t.contact;

  const titleId = useId();
  const subId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  // Mount lifecycle (mount === open): remember the trigger, focus the first
  // field, lock scroll, and wire Esc + a focus trap. Cleanup restores everything.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      restoreFocusRef.current?.focus?.();
    };
  }, [onClose]);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = c.errRequired;
    if (!email.trim()) next.email = c.errRequired;
    else if (!EMAIL_RE.test(email.trim())) next.email = c.errEmail;
    if (!message.trim()) next.message = c.errRequired;
    return next;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const subject = encodeURIComponent(c.mailSubject);
    const body = encodeURIComponent(
      `${c.nameLabel}: ${name}\n${c.emailLabel}: ${email}\n\n${message}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const fieldClass =
    "w-full rounded-lg border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-silver/35 outline-none transition-colors focus:border-logo-blue focus:bg-white/10";

  return (
    <div
      className="modal-overlay pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subId}
        className="modal-panel relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0d14]/95 p-6 shadow-2xl shadow-black/60 sm:p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={c.close}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-silver/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {sent ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-logo-blue/40 bg-logo-blue/10 text-logo-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M5 12.5l4 4 10-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 id={titleId} className="text-xl font-semibold text-white">
              {c.successTitle}
            </h2>
            <p id={subId} className="mt-3 text-sm leading-6 text-silver/70">
              {c.successBody}
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-2 inline-block text-sm font-medium text-logo-blue underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            <div className="mt-8">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 bg-white/5 px-7 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                {c.close}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 id={titleId} className="pr-8 text-2xl font-semibold tracking-tight text-white">
              {c.title}
            </h2>
            <p id={subId} className="mt-2 text-sm leading-6 text-silver/70">
              {c.subtitle}
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-silver/55"
                >
                  {c.nameLabel}
                </label>
                <input
                  id="contact-name"
                  ref={firstFieldRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={c.namePlaceholder}
                  aria-invalid={!!errors.name}
                  className={`${fieldClass} ${errors.name ? "border-logo-red/70" : "border-white/10"}`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-logo-red" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-silver/55"
                >
                  {c.emailLabel}
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={c.emailPlaceholder}
                  aria-invalid={!!errors.email}
                  className={`${fieldClass} ${errors.email ? "border-logo-red/70" : "border-white/10"}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-logo-red" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-silver/55"
                >
                  {c.messageLabel}
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={c.messagePlaceholder}
                  rows={4}
                  aria-invalid={!!errors.message}
                  className={`${fieldClass} resize-none ${errors.message ? "border-logo-red/70" : "border-white/10"}`}
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-logo-red" role="alert">
                    {errors.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-xs text-silver/45">
                  {c.orEmail}{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-silver/70 underline-offset-4 hover:text-white hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </span>
                <button
                  type="submit"
                  className="rounded-full bg-logo-red px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-logo-red-glow"
                >
                  {c.submit}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
