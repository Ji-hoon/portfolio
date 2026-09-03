"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { roleQuery, useEntryRole } from "@/lib/entry-role";
import { ui, type Lang } from "@/lib/i18n";
import {
  persistLanguageForReload,
  useLanguageStore,
} from "@/lib/language-store";
import type { Role } from "@/lib/role";

const MENU = [
  { id: "projects", label: ui.nav.projects },
  { id: "archives", label: ui.nav.archives },
  { id: "contact", label: ui.nav.contact },
] as const;

export default function Header() {
  const pathname = usePathname();
  const lang = useLanguageStore((state) => state.lang);
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Role captured from the entry `?r=` (persisted per tab by the layout inline
  // script before hydration). Every home-bound link rides it along.
  const entryRole = useEntryRole();

  // Close the mobile dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const changeLanguage = (code: Lang) => {
    if (code === lang) return;
    persistLanguageForReload(code);
    window.location.reload();
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm pt-[env(safe-area-inset-top)] mx-auto max-w-[1920px] px-6 md:px-12 lg:px-16"
    >
      <div className="mx-auto max-w-[1200px] px-0 md:px-6 lg:px-6">
        <div className="flex items-center justify-between py-6">
          {/* Logo → home; an entry `?r=` rides along so the role variant survives */}
          {isHome && !entryRole ? (
            <a href="#home" className="text-base font-medium tracking-tight">
              {ui.logo[lang]}
            </a>
          ) : (
            <Link
              href={`/${roleQuery(entryRole)}${isHome ? "#home" : ""}`}
              className="text-base font-medium tracking-tight"
            >
              {ui.logo[lang]}
            </Link>
          )}

          <div className="flex items-center gap-5 gnb:gap-8">
            {/* Inline nav above 640px */}
            <nav className="hidden gap-8 text-sm font-medium gnb:flex">
              <NavItems
                isHome={isHome}
                lang={lang}
                entryRole={entryRole}
                className="transition-colors hover:text-blue-600"
              />
            </nav>

            {/* Language toggle */}
            <div
              className="flex items-center rounded-2xl bg-[#e7ebef] p-1 text-sm font-medium"
              role="tablist"
              aria-label="Language"
            >
              {(["ko", "en"] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  onClick={() => changeLanguage(code)}
                  aria-selected={lang === code}
                  className={`min-w-10 rounded-xl px-2 py-0.5 uppercase transition-colors ${
                    lang === code
                      ? "bg-white text-ink shadow-[0_2px_5px_rgba(15,23,42,0.16)]"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Hamburger at 640px and below */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="Menu"
              className="-mr-1 p-1 transition-colors hover:text-blue-600 gnb:hidden"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </>
                ) : (
                  <>
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown at 640px and below */}
        {menuOpen && (
          <nav className="dropdown-panel absolute right-8 left-8 rounded-2xl top-16 -mx-6 flex flex-col border-y border-ink/10 bg-white py-2 text-sm font-medium shadow-sm gnb:hidden">
            <NavItems
              isHome={isHome}
              lang={lang}
              entryRole={entryRole}
              onNavigate={closeMenu}
              className="px-6 py-3 transition-colors hover:bg-surface hover:text-blue-600"
            />
          </nav>
        )}
      </div>
    </header>
  );
}

function NavItems({
  isHome,
  lang,
  entryRole,
  className,
  onNavigate,
}: {
  isHome: boolean;
  lang: Lang;
  entryRole: Role | null;
  className: string;
  onNavigate?: () => void;
}) {
  // Every nav link rides the entry `?r=` along, same as the logo, so the role
  // variant survives any route the visitor takes back to home.
  const query = roleQuery(entryRole);

  return (
    <>
      {MENU.map((item) => {
        const isContact = item.id === "contact";
        const href = isContact
          ? isHome && !entryRole
            ? "#contact"
            : `/${query}#contact`
          : `/${item.id}${query}`;

        return isContact && isHome && !entryRole ? (
          <a
            key={item.id}
            href={href}
            onClick={onNavigate}
            className={className}
          >
            {item.label[lang]}
          </a>
        ) : (
          <Link
            key={item.id}
            href={href}
            onClick={onNavigate}
            className={className}
          >
            {item.label[lang]}
          </Link>
        );
      })}
    </>
  );
}
