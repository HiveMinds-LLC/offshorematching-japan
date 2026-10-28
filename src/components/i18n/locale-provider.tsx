"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type SiteLocale = "ja" | "en";

type LocaleContextValue = {
  locale: SiteLocale;
  setLocale: (locale: SiteLocale) => void;
};

const LOCALE_KEY = "offshorematch-locale";
const localeListeners = new Set<() => void>();
const LocaleContext = createContext<LocaleContextValue | null>(null);

function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    localeListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getLocaleSnapshot(): SiteLocale {
  return window.localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "ja";
}

function getLocaleServerSnapshot(): SiteLocale {
  return "ja";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleServerSnapshot);
  const setLocale = useCallback((nextLocale: SiteLocale) => {
    window.localStorage.setItem(LOCALE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    localeListeners.forEach((listener) => listener());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }
  return context;
}
