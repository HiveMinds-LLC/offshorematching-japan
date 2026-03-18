"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type SiteLocale = "ja" | "en";

type LocaleContextValue = {
  locale: SiteLocale;
  setLocale: (locale: SiteLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<SiteLocale>("ja");

  useEffect(() => {
    const stored = window.localStorage.getItem("offshorematch-locale");
    if (stored === "ja" || stored === "en") {
      setLocale(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("offshorematch-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }
  return context;
}
