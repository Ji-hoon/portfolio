"use client";

import Link from "next/link";
import { ui } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/language-store";

export default function NotFound() {
  const lang = useLanguageStore((state) => state.lang);

  return (
    <main className="flex min-h-[60vh] flex-col items-start justify-center gap-6">
      <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">404</h1>
      <p className="text-base text-muted">{ui.notFound.message[lang]}</p>
      <Link
        href="/"
        className="text-sm font-medium underline underline-offset-4 transition-colors hover:text-blue-600"
      >
        {ui.notFound.home[lang]}
      </Link>
    </main>
  );
}
