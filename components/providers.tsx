"use client";

import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLanguageStore } from "@/lib/language-store";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // Keep server requests isolated and preserve the browser cache across renders.
  if (typeof window === "undefined") return new QueryClient();
  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Language store persists with skipHydration to avoid SSR mismatch.
    useLanguageStore.persist.rehydrate();

    const applyLang = (lang: string) => {
      document.documentElement.lang = lang;
    };
    applyLang(useLanguageStore.getState().lang);
    return useLanguageStore.subscribe((state) => applyLang(state.lang));
  }, []);

  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
