import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lang } from "./i18n";

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const LANGUAGE_STORAGE_KEY = "portfolio-lang";

/** Persist the next language without updating the current React tree first. */
export function persistLanguageForReload(lang: Lang) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    LANGUAGE_STORAGE_KEY,
    JSON.stringify({ state: { lang }, version: 0 }),
  );
}

/**
 * Client state (zustand). Persisted to localStorage with `skipHydration` so the
 * server-rendered HTML (default "ko") never mismatches; Providers rehydrates it
 * after mount.
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: "ko",
      setLang: (lang) => set({ lang }),
    }),
    {
      name: LANGUAGE_STORAGE_KEY,
      skipHydration: true,
    },
  ),
);
