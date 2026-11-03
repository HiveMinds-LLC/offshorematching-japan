"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type AppTheme = "light" | "dark";

const THEME_KEY = "offshorekaihatsu.app-theme";
const LEGACY_THEME_KEY = "offshoredevelopment.app-theme";
const themeListeners = new Set<() => void>();

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === LEGACY_THEME_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readStoredTheme(): AppTheme | null {
  const saved = window.localStorage.getItem(THEME_KEY) ?? window.localStorage.getItem(LEGACY_THEME_KEY);
  return saved === "dark" || saved === "light" ? saved : null;
}

function getThemeSnapshot(): AppTheme {
  return readStoredTheme() ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function getThemeServerSnapshot(): AppTheme {
  return "light";
}

function applyThemeClass(theme: AppTheme) {
  document.body.classList.toggle("app-theme-dark", theme === "dark");
}

export function useAppTheme(enabled = true) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove("app-theme-dark");
      return;
    }
    applyThemeClass(theme);
  }, [enabled, theme]);

  const toggleTheme = useCallback(() => {
    const nextTheme: AppTheme = getThemeSnapshot() === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_KEY, nextTheme);
    applyThemeClass(nextTheme);
    themeListeners.forEach((listener) => listener());
  }, []);

  return { theme, toggleTheme };
}
