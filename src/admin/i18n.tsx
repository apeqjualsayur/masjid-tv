"use client";
// Tiny i18n for the admin app (PRD Phase 2 §9). BM default; English toggle.
// Language: localStorage on this device, replaced by profiles.lang once signed in.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "./i18n/en.json";
import ms from "./i18n/ms.json";

export type Lang = "ms" | "en";
export const DICTS = { ms, en } as const;
const STORAGE_KEY = "mv:lang";

type Vars = Record<string, string | number>;

/** Look up "home.next" in a dictionary and fill {placeholders}. Falls back to BM, then to the key. */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const find = (dict: unknown) => key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict);
  const raw = find(DICTS[lang]) ?? find(DICTS.ms);
  if (typeof raw !== "string") return key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`)) : raw;
}

export function readSavedLang(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "ms" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
  /** Intl locale for dates: ms-MY / en-MY. */
  locale: string;
}
const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children, onChange }: { children: ReactNode; onChange?: (l: Lang) => void }) {
  const [lang, setLangState] = useState<Lang>("ms");
  useEffect(() => {
    const saved = readSavedLang();
    if (saved) setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      try {
        localStorage.setItem(STORAGE_KEY, l);
      } catch {
        // private mode: the choice lasts for this page only
      }
      onChange?.(l);
    },
    [onChange],
  );
  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars), locale: lang === "ms" ? "ms-MY" : "en-MY" }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useT() must be used inside <LangProvider>");
  return c;
}