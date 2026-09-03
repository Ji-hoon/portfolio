"use client";

import { ui } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/language-store";

export default function Footer() {
  const lang = useLanguageStore((state) => state.lang);

  return (
    <footer className="flex flex-col items-start justify-between gap-8 pb-10 pt-8 text-sm font-medium text-muted md:flex-row md:items-center">
      <div className="text-ink">
        {ui.logo[lang]} © 2026 · Built with Codex & Claude Code.
      </div>
      {/* <div className="flex items-center gap-2 text-ink">
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
      </div> */}
    </footer>
  );
}
