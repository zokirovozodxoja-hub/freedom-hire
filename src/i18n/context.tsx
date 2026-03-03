"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import ru from "./ru";
import uz from "./uz";
import type { Translations } from "./ru";

export type Lang = "ru" | "uz";

const translations: Record<Lang, Translations> = { ru, uz };

interface I18nContextValue {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "ru",
  t: ru,
  setLang: () => {},
});

const STORAGE_KEY = "fh_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "ru" || saved === "uz") {
        setLangState(saved);
      }
    } catch {}
  }, []);

  function setLang(newLang: Lang) {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
  }

  return (
    <I18nContext.Provider value={{ lang, t: translations[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
