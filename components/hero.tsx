"use client";

import { ui } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/language-store";
import { ROLE_LABEL, type Role } from "@/lib/role";
import { useEffect, useState, type ReactNode } from "react";
import Reveal from "./reveal";

export default function Hero({ roleSlot }: { roleSlot?: ReactNode }) {
  const lang = useLanguageStore((state) => state.lang);

  return (
    <section id="home" className="mb-32 scroll-mt-28 pt-16 md:mb-48 md:pt-24">
      <Reveal>
        <h1 className="mb-24 max-w-[1200px] break-keep text-4xl font-semibold leading-[1.3] tracking-tight md:mb-32 md:text-5xl lg:text-[4rem]">
          {ui.hero.headline[lang]}
          {roleSlot}
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
 * 히어로 문장의 역할 자리. design만 회전 슬롯(디자이너 ⇄ 엔지니어)을 굴리고,
 * 나머지 역할은 명칭 하나를 정적 텍스트로 보여준다. 회전 시에는 슬롯 전체가
 * aria-hidden이므로, 추출되는 텍스트는 어느 쪽이든 ROLE_LABEL 하나뿐이다.
 */
export function RoleSlot({ role }: { role: Role }) {
  const lang = useLanguageStore((state) => state.lang);

  if (role !== "design") {
    return <span className="role-static">{ROLE_LABEL[role][lang]}</span>;
  }

  return (
    <>
      <span className="sr-only">{ROLE_LABEL.design[lang]}</span>
      <RoleRoller lang={lang} />
    </>
  );
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
