"use client";
// Landing header (PRD §4 row 1, design Lembut-Full): sticky; lockup, section anchors, BM/EN, Log masuk,
// Daftar percuma. Below 900 px: lockup + Daftar + a menu button opening a sheet (focus trap, Esc).
import { useCallback, useEffect, useRef, useState } from "react";
import { copy, homeHref, pageHref, sectionHref, type Lang, type Page } from "./i18n";

export const ADMIN_HREF = "/admin/";

/** Section anchors in the header, in design order. */
export const NAV = [
  { id: "ciri", key: "features" },
  { id: "panel", key: "panel" },
  { id: "peranti", key: "devices" },
  { id: "cara", key: "start" },
  { id: "soalan", key: "faq" },
] as const;

/** The current #anchor, kept up to date, so BM/EN can link to the same place. */
function useHash(): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return hash;
}

/** BM | EN segmented links to the same page; the other language keeps the current #anchor. */
export function LangSwitch({ lang, page = "home", className = "" }: { lang: Lang; page?: Page; className?: string }) {
  const c = copy(lang);
  const hash = useHash();
  const item = (l: Lang, label: string) => {
    const on = l === lang;
    return (
      <a
        href={`${pageHref(l, page)}${hash}`}
        hrefLang={l}
        lang={l}
        aria-current={on ? "page" : undefined}
        className={`flex h-9 min-w-11 items-center justify-center rounded-full px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lb-deep ${on ? "bg-white text-lb-ink shadow-[0_1px_2px_rgba(16,36,27,0.08)]" : "text-lb-muted hover:text-lb-ink"}`}
      >
        {label}
      </a>
    );
  };
  return (
    <div role="group" aria-label={c.a11y.language} className={`items-center rounded-full bg-lb-soft p-[3px] text-[13px] font-bold ${className}`}>
      {item("ms", c.nav.langMs)}
      {item("en", c.nav.langEn)}
    </div>
  );
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lb-deep";

export function Header({ lang, page = "home" }: { lang: Lang; page?: Page }) {
  const c = copy(lang);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  // Sheet: focus the first link, trap Tab inside, Esc closes, focus goes back to the menu button.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const focusables = () => Array.from(sheet.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const btn = button.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = prevOverflow;
      btn?.focus();
    };
  }, [open]);

  // Back on a wide screen: the sheet has no button to close it from, so close it.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open]);

  return (
    <>
      <a href="#kandungan" className={`sr-only z-50 rounded-lg bg-lb-ink px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 ${focusRing}`}>
        {c.a11y.skip}
      </a>
      <header className="sticky top-0 z-30 border-b border-lb-hair bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[70px] max-w-[1200px] items-center gap-3 px-4 min-[400px]:px-5 min-[900px]:gap-8">
          <a href={homeHref(lang)} aria-label={c.a11y.home} className={`flex flex-none items-center rounded-md ${focusRing}`}>
            <img src="/brand/mv-lockup.svg" alt="" width={141} height={32} className="h-7 w-auto min-[380px]:h-8 min-[900px]:h-9" />
          </a>
          <nav aria-label={c.a11y.mainNav} className="mx-auto hidden gap-7 text-[15px] font-medium min-[900px]:flex">
            {NAV.map((n) => (
              <a key={n.id} href={sectionHref(lang, page, n.id)} className={`rounded text-lb-muted hover:text-lb-ink ${focusRing}`}>
                {c.nav[n.key]}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 min-[400px]:gap-3">
            <LangSwitch lang={lang} page={page} className="hidden min-[900px]:flex" />
            <a href={ADMIN_HREF} className={`hidden rounded text-[15px] font-semibold min-[900px]:block ${focusRing}`}>
              {c.nav.login}
            </a>
            <a href={ADMIN_HREF} className={`flex h-[42px] items-center rounded-full bg-lb-primary px-4 text-[15px] min-[400px]:px-5 font-semibold whitespace-nowrap text-white hover:bg-lb-deep ${focusRing}`}>
              {c.nav.signup}
            </a>
            <button
              ref={button}
              type="button"
              aria-label={c.a11y.menu}
              aria-expanded={open}
              aria-controls="lb-menu"
              onClick={() => setOpen(true)}
              className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-lb-line bg-white text-lb-ink min-[900px]:hidden ${focusRing}`}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16 M4 12h16 M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 min-[900px]:hidden">
          <div className="absolute inset-0 bg-lb-ink/40" onClick={close} aria-hidden="true" />
          <div
            id="lb-menu"
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-label={c.a11y.menu}
            className="absolute inset-x-0 top-0 flex flex-col gap-1 rounded-b-3xl bg-white px-5 pt-3 pb-6 shadow-[0_20px_40px_rgba(16,36,27,0.18)]"
          >
            <div className="flex h-[46px] items-center justify-between">
              <img src="/brand/mv-lockup.svg" alt="" width={141} height={32} className="h-8 w-auto" />
              <button type="button" aria-label={c.a11y.closeMenu} onClick={close} className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-lb-line text-lb-ink ${focusRing}`}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12 M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label={c.a11y.mainNav} className="mt-2 flex flex-col">
              {NAV.map((n) => (
                <a key={n.id} href={sectionHref(lang, page, n.id)} onClick={close} className={`flex h-12 items-center border-b border-lb-hair text-[17px] font-semibold ${focusRing}`}>
                  {c.nav[n.key]}
                </a>
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-between gap-3">
              <LangSwitch lang={lang} page={page} className="flex" />
              <a href={ADMIN_HREF} className={`flex h-11 items-center rounded px-2 text-[16px] font-semibold ${focusRing}`}>
                {c.nav.login}
              </a>
            </div>
            <a href={ADMIN_HREF} className={`mt-3 flex h-12 items-center justify-center rounded-full bg-lb-primary text-[16px] font-semibold text-white ${focusRing}`}>
              {c.nav.signup}
            </a>
          </div>
        </div>
      )}
    </>
  );
}