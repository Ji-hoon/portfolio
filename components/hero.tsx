"use client";

import { ui } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/language-store";
import { ROLE_LABEL, type Role } from "@/lib/role";
import { useEffect, useState, type ReactNode } from "react";
import Reveal from "./reveal";

export default function Hero({ roleText }: { roleText?: ReactNode }) {
  const lang = useLanguageStore((state) => state.lang);

  return (
    <section id="home" className="mb-32 scroll-mt-28 pt-16 md:mb-48 md:pt-24">
      <Reveal>
        <h1 className="mb-24 max-w-[1200px] break-keep text-4xl font-semibold leading-[1.3] tracking-tight md:mb-32 md:text-5xl lg:text-[4rem]">
          {ui.hero.headline[lang]}
          {roleText}
          <RoleRoller lang={lang} />
          {ui.hero.headlineAfterRole[lang]}
        </h1>

        <div className="grid max-w-3xl grid-cols-1 gap-12 text-sm font-medium md:grid-cols-2">
          <div>
            <p className="mb-1">{ui.hero.currentLabel[lang]}</p>
            <p className="text-muted">{ui.hero.role[lang]}</p>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-ink">
              {ui.hero.selectedWork[lang]}
              {/* <ArrowUpRight /> */}
            </p>
            <p className="text-muted">{ui.hero.period[lang]}</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/**
 * 회전 슬롯 자리에서 실제로 읽히는(스크린리더·텍스트 추출) 단일 역할 명칭.
 * 회전 슬롯은 통째로 aria-hidden이므로 헤드라인 문장은 이 한 단어로 완결된다.
 */
export function SrRole({ role }: { role: Role }) {
  const lang = useLanguageStore((state) => state.lang);
  return <span className="sr-only">{ROLE_LABEL[role][lang]}</span>;
}

function RoleRoller({ lang }: { lang: "ko" | "en" }) {
  const roles =
    lang === "ko" ? ["디자이너", "엔지니어"] : ["Designer", "Engineer"];
  const [isAppLoaded, setIsAppLoaded] = useState(false);

  useEffect(() => {
    const startAnimation = () => setIsAppLoaded(true);

    if (document.readyState === "complete") {
      startAnimation();
      return;
    }

    window.addEventListener("load", startAnimation, { once: true });
    return () => window.removeEventListener("load", startAnimation);
  }, []);

  return (
    <span
      className={`role-viewport${lang === "en" ? " role-viewport-en" : ""}`}
      aria-hidden="true"
      style={{
        transform: "translate(0px, 0px)",
      }}
    >
      <span className={`role-roller${isAppLoaded ? " is-loaded" : ""}`}>
        {[...roles, roles[0]].map((role, index) => (
          <span
            key={`${role}-${index}`}
            className="block whitespace-nowrap"
            data-label={role}
          />
        ))}
      </span>
    </span>
  );
}

export function ArrowUpRight({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}
