"use client";

import { ui } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/language-store";
import Reveal from "./reveal";
import { ArrowUpRight } from "./hero";

const LINKS = [
  { label: "Email", href: "mailto:lanslot84@gmail.com" },
  /* 현재 사이트가 포트폴리오이므로 주석처리
  {
    label: "Portfolio",
    href: "https://stellar-rook-e9e.notion.site/Frontend-Developer-73de57518b094030bf50ea12721c51b6",
  },
  */
  { label: "GitHub", href: "https://github.com/Ji-hoon" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jhkimux/" },
  { label: "Blog", href: "https://ji-hoon.github.io/blog/" },
] as const;

export default function Contact() {
  const lang = useLanguageStore((state) => state.lang);
  const section = ui.sections.contact;

  return (
    <section id="contact" className="mb-32 scroll-mt-28 md:mb-48">
      <Reveal className="mb-8 flex items-baseline gap-3">
        <h2 className="text-sm font-semibold">{section.title[lang]}</h2>
        <p className="text-sm text-muted">{section.description[lang]}</p>
      </Reveal>

      <Reveal className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-8">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("mailto:") ? undefined : "_blank"}
            rel={
              link.href.startsWith("mailto:")
                ? undefined
                : "noopener noreferrer"
            }
            className="group flex items-center justify-between border-t border-ink/10 pt-6 text-base font-medium transition-colors hover:text-blue-600"
          >
            {link.label}
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight size={18} />
            </span>
          </a>
        ))}
      </Reveal>
    </section>
  );
}
