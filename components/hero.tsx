"use client";

import { ui } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/language-store";
import { ROLE_LABEL, resolveRole, type Role } from "@/lib/role";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import Reveal from "./reveal";

export default function Hero({ srRole }: { srRole?: ReactNode }) {
  const lang = useLanguageStore((state) => state.lang);

  return (
    <section id="home" className="mb-32 scroll-mt-28 pt-16 md:mb-48 md:pt-24">
      <Reveal>
        <h1 className="mb-24 max-w-[1200px] break-keep text-4xl font-semibold leading-[1.3] tracking-tight md:mb-32 md:text-5xl lg:text-[4rem]">
          {ui.hero.headline[lang]}
          {srRole}
          <RoleSlot lang={lang} />
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
      <Suspense fallback={null}>
        <RoleSync />
      </Suspense>
    </section>
  );
}

/**
 * 스크린리더·텍스트 추출에 노출되는 단일 역할 명칭 — 시각 레이어(RoleSlot)는
 * 전부 aria-hidden + pseudo-element라 헤드라인 문장은 이 한 단어로 완결된다.
 */
export function SrRole({ role }: { role: Role }) {
  const lang = useLanguageStore((state) => state.lang);
  return <span className="sr-only">{ROLE_LABEL[role][lang]}</span>;
}

/**
 * 역할 자리의 시각 레이어. 세 변형을 모두 정적 셸에 렌더해 두고, <head>의
 * 인라인 스크립트가 첫 페인트 전에 세팅하는 html[data-r]로 CSS가 하나만
 * 보여준다 — 변형 선택에 서버 왕복이 없어 어떤 진입 경로에서도 다른 역할
 * 문구가 스치지 않는다. design만 회전 슬롯을 굴리고 나머지는 정적 명칭이다.
 */
function RoleSlot({ lang }: { lang: "ko" | "en" }) {
  return (
    <span className="role-slot" aria-hidden="true">
      <span
        className="role-static"
        data-variant="frontend"
        data-label={ROLE_LABEL.frontend[lang]}
      />
      <span
        className="role-static"
        data-variant="product"
        data-label={ROLE_LABEL.product[lang]}
      />
      <span data-variant="design">
        <RoleRoller lang={lang} />
      </span>
    </span>
  );
}

/** 소프트 내비게이션으로 쿼리만 바뀌는 경우에도 html[data-r]을 따라 맞춘다. */
function RoleSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    document.documentElement.dataset.r = resolveRole(searchParams.getAll("r"));
  }, [searchParams]);

  return null;
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
