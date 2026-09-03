"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LuChevronLeft, LuList } from "react-icons/lu";
import { FiX } from "react-icons/fi";
import { useEffect, useMemo, useRef, useState } from "react";
import { ui } from "@/lib/i18n";
import { workCache } from "@/lib/work-cache";
import { useLanguageStore } from "@/lib/language-store";
import type { ArchitectureContent } from "@/lib/content";
import { ArrowUpRight } from "./hero";
import WorkImageCarousel from "./work-image-carousel";

const TOC_FOCUS_RATIO = 0.5;

function getHeaderOffset() {
  return document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
}

function getTocFocusMarker() {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const headerOffset = getHeaderOffset();
  return (
    headerOffset +
    Math.max(viewportHeight - headerOffset, 0) * TOC_FOCUS_RATIO
  );
}

function getTocClickOffset(id: string, items: TocItem[]) {
  const headerOffset = getHeaderOffset();
  const section = document.getElementById(id);
  const itemIndex = items.findIndex((item) => item.id === id);
  const nextItem = itemIndex >= 0 ? items[itemIndex + 1] : undefined;
  const nextSection = nextItem
    ? document.getElementById(nextItem.id)
    : null;

  if (!section || !nextSection) return headerOffset;

  const sectionGap =
    nextSection.getBoundingClientRect().top -
    section.getBoundingClientRect().top;
  const minimumOffset = getTocFocusMarker() - sectionGap + 1;

  return Math.max(headerOffset, minimumOffset);
}

export default function DetailView({ id }: { id: string }) {
  const router = useRouter();
  const lang = useLanguageStore((state) => state.lang);
  const { data: item } = useSuspenseQuery(workCache.itemOptions(id));
  const labels = ui.detail;
  const stackLabel = item.type === "project" ? labels.techStack : labels.skills;
  const tocItems = useMemo(
    () => [
      ...(item.objectives
        ? [{ id: "objectives", label: labels.objectives[lang] }]
        : []),
      { id: "key-accomplishment", label: labels.accomplishments[lang] },
      ...(item.architecture
        ? [{ id: "architecture", label: labels.architecture[lang] }]
        : []),
      ...(item.technicalChallenges
        ? [
            {
              id: "technical-challenges",
              label: labels.technicalChallenges[lang],
            },
          ]
        : []),
      { id: "details", label: labels.details[lang] },
    ],
    [
      item.architecture,
      item.technicalChallenges,
      item.objectives,
      lang,
      labels.accomplishments,
      labels.architecture,
      labels.details,
      labels.objectives,
      labels.technicalChallenges,
    ],
  );
  const [tocOpen, setTocOpen] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const pendingTocIdRef = useRef<string | null>(null);

  const handleTocChange = (id: string) => {
    const section = document.getElementById(id);
    const clickPosition = getTocClickOffset(id, tocItems);
    pendingTocIdRef.current =
      section && Math.abs(section.getBoundingClientRect().top - clickPosition) > 4
        ? id
        : null;
    setActiveTocId(id);
  };

  useEffect(() => {
    const updateActiveToc = () => {
      const marker = getTocFocusMarker();
      const pendingId = pendingTocIdRef.current;

      if (pendingId) {
        const pendingSection = document.getElementById(pendingId);
        if (pendingSection) {
          setActiveTocId((currentId) =>
            currentId === pendingId ? currentId : pendingId,
          );
          return;
        }
        pendingTocIdRef.current = null;
      }

      let nextId: string | null = null;

      for (const tocItem of tocItems) {
        const section = document.getElementById(tocItem.id);
        if (section && section.getBoundingClientRect().top <= marker) {
          nextId = tocItem.id;
        }
      }

      setActiveTocId((currentId) =>
        currentId === nextId ? currentId : nextId,
      );
    };

    const updateAfterScrollEnd = () => {
      pendingTocIdRef.current = null;
      updateActiveToc();
    };
    const supportsScrollEnd = "onscrollend" in window;
    let fallbackTimer: number | undefined;
    const handleScroll = () => {
      updateActiveToc();
      if (!supportsScrollEnd) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = window.setTimeout(updateAfterScrollEnd, 250);
      }
    };

    updateActiveToc();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scrollend", updateAfterScrollEnd);
    window.addEventListener("resize", updateActiveToc);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scrollend", updateAfterScrollEnd);
      window.removeEventListener("resize", updateActiveToc);
      window.clearTimeout(fallbackTimer);
    };
  }, [tocItems]);

  return (
    <article className="mx-auto max-w-[1200px] px-0 md:px-6 lg:px-6 pt-8 md:pt-16">
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push(item.type === "project" ? "/projects" : "/archives");
          }
        }}
        aria-label={labels.back[lang]}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <LuChevronLeft aria-hidden size={18} />
        <span>{labels.back[lang]}</span>
      </button>

      <DetailToc
        items={tocItems}
        label={labels.toc[lang]}
        open={tocOpen}
        activeId={activeTocId}
        onActiveChange={handleTocChange}
        onOpenChange={setTocOpen}
      />

      {/* Title */}
      <header className="mb-12 mt-8 md:mb-16">
        <p className="mb-3 text-sm font-medium text-muted">
          {item.type === "project"
            ? labels.project[lang]
            : labels.archive[lang]}{" "}
          · {item.year} · {item.category}
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          {item.title[lang]}
        </h1>
      </header>

      {/* Hero image */}
      <div className="mb-12 md:mb-16">
        <WorkImageCarousel
          images={[
            ...(item.image ? [item.image] : []),
            ...(item.subImages ?? []),
          ]}
          alt={item.title[lang]}
          detail
        />
      </div>

      {/* Meta: duration / role / stack / public link */}
      <dl className="mb-12 grid grid-cols-1 gap-8 text-sm md:mb-16 md:grid-cols-4">
        <div>
          <dt className="mb-1 font-medium text-muted">
            {labels.duration[lang]}
          </dt>
          <dd className="font-medium">{item.duration[lang]}</dd>
        </div>
        <div>
          <dt className="mb-1 font-medium text-muted">{labels.role[lang]}</dt>
          <dd className="font-medium">{item.role[lang]}</dd>
        </div>
        <div>
          <dt className="mb-1 font-medium text-muted">{stackLabel[lang]}</dt>
          <dd className="flex flex-wrap gap-1.5">
            {item.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </dd>
        </div>
        {item.relatedLink ? (
          <div>
            <dt className="mb-1 font-medium text-muted">
              {labels.relatedLink[lang]}
            </dt>
            <dd>
              <a
                href={item.relatedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium transition-colors hover:text-blue-600"
              >
                {new URL(item.relatedLink).hostname}
                <ArrowUpRight size={14} />
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {item.objectives ? (
        <section id="objectives" className="mb-12 scroll-mt-28 md:mb-16">
          <h2 className="mb-4 text-sm font-semibold">
            {labels.objectives[lang]}
          </h2>
          <h3 className="mb-4 max-w-3xl text-xl font-medium leading-snug">
            {item.objectives.title[lang]}
          </h3>
          <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink/90">
            {item.objectives.description[lang].map((paragraph) => (
              <p key={paragraph}>
                <InlineCodeText text={paragraph} />
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {/* Key accomplishment */}
      <section id="key-accomplishment" className="mb-12 scroll-mt-28 md:mb-16">
        <h2 className="mb-4 text-sm font-semibold">
          {labels.accomplishments[lang]}
        </h2>
        <ul className="max-w-3xl space-y-2 text-base leading-relaxed">
          {item.accomplishments[lang].map((line) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden className="select-none text-muted">
                —
              </span>
              <InlineCodeText text={line} />
            </li>
          ))}
        </ul>
      </section>

      {item.architecture ? (
        <ArchitectureSection
          architecture={item.architecture}
          label={labels.architecture[lang]}
          lang={lang}
        />
      ) : null}

      {item.technicalChallenges ? (
        <section
          id="technical-challenges"
          className="mb-24 scroll-mt-28 md:mb-32"
        >
          <h2 className="mb-4 text-sm font-semibold">
            {labels.technicalChallenges[lang]}
          </h2>
          <ul className="max-w-3xl space-y-3 text-base leading-relaxed text-ink/90">
            {item.technicalChallenges[lang].map((challenge) => (
              <li key={challenge} className="flex gap-3">
                <span aria-hidden className="select-none text-muted">
                  —
                </span>
                <InlineCodeText text={challenge} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Details */}
      <section id="details" className="mb-24 scroll-mt-28 md:mb-32">
        <h2 className="mb-4 text-sm font-semibold">{labels.details[lang]}</h2>
        <div className="max-w-3xl space-y-4 text-base leading-relaxed text-ink/90">
          {item.details[lang].map((paragraph) => (
            <p key={paragraph}>
              <InlineCodeText text={paragraph} />
            </p>
          ))}
        </div>
      </section>
    </article>
  );
}

function InlineCodeText({ text }: { text: string }) {
  return (
    <span>
      {text.split(/(`[^`]+`)/g).map((part, index) => {
        const isCode = part.startsWith("`") && part.endsWith("`");
        return isCode ? (
          <code
            key={`${index}-${part}`}
            className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em]"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={`${index}-${part}`}>{part}</span>
        );
      })}
    </span>
  );
}

function ArchitectureSection({
  architecture,
  label,
  lang,
}: {
  architecture: ArchitectureContent;
  label: string;
  lang: "ko" | "en";
}) {
  const localizedArchitecture = architecture[lang];

  return (
    <section id="architecture" className="mb-24 scroll-mt-28 md:mb-32">
      <h2 className="mb-4 text-sm font-semibold">{label}</h2>
      <p className="mb-8 max-w-3xl text-base leading-relaxed text-ink/90">
        {localizedArchitecture.overview}
      </p>
      <div className="overflow-x-auto bg-[#f8fafc] p-3 md:p-5">
        <Image
          alt={`${label}: ${localizedArchitecture.overview}`}
          className="h-auto min-w-[760px] w-full"
          height={420}
          src={architecture.image}
          width={1000}
        />
      </div>
    </section>
  );
}

type TocItem = { id: string; label: string };

function DetailToc({
  items,
  label,
  open,
  activeId,
  onActiveChange,
  onOpenChange,
}: {
  items: TocItem[];
  label: string;
  open: boolean;
  activeId: string | null;
  onActiveChange: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const isVisible = activeId !== null;
  const renderLinks = () => (
    <TocLinks
      activeId={activeId}
      ariaLabel={label}
      items={items}
      onActiveChange={onActiveChange}
      onSelect={() => onOpenChange(false)}
    />
  );

  return (
    <>
      <aside
        aria-hidden={!isVisible}
        className={`sticky left-[100%] top-1/2 z-30 hidden h-0 w-0 -translate-y-1/2 transition-opacity duration-300 min-[1440px]:block ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {renderLinks()}
      </aside>

      {open && isVisible ? (
        <div className="fixed bottom-20 right-6 z-40 w-64 rounded-2xl border border-ink/10 bg-white p-4 shadow-xl min-[1440px]:hidden">
          {renderLinks()}
        </div>
      ) : null}

      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-hidden={!isVisible}
        className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-lg transition-[opacity,transform] duration-300 hover:scale-105 min-[1440px]:hidden ${isVisible ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
        onClick={() => onOpenChange(!open)}
      >
        {open ? (
          <FiX aria-hidden size={20} />
        ) : (
          <LuList aria-hidden size={20} />
        )}
      </button>
    </>
  );
}

function TocLinks({
  items,
  activeId,
  ariaLabel,
  onActiveChange,
  onSelect,
}: {
  items: TocItem[];
  activeId: string | null;
  ariaLabel: string;
  onActiveChange: (id: string) => void;
  onSelect: () => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const list = listRef.current;
      const link = activeId ? linkRefs.current[activeId] : null;
      if (!list || !link) return;

      const listTop = list.getBoundingClientRect().top;
      const linkRect = link.getBoundingClientRect();
      setIndicator({
        top: linkRect.top - listTop,
        height: linkRect.height,
      });
    };

    const frame = window.requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeId, items]);

  return (
    <nav aria-label={ariaLabel} className="ml-0">
      <ol
        ref={listRef}
        className="relative space-y-2 border-l border-ink/10 pl-3"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -left-px z-10 w-0.5 rounded-full bg-[#333] transition-[top,height] duration-300 ease-out"
          style={{
            height: `${indicator.height}px`,
            top: `${indicator.top}px`,
          }}
        />
        {items.map((item) => (
          <li key={item.id}>
            <a
              ref={(element) => {
                linkRefs.current[item.id] = element;
              }}
              href={`#${item.id}`}
              aria-current={activeId === item.id ? "location" : undefined}
              className={`inline-block text-sm transition-colors ${activeId === item.id ? "text-ink" : "text-muted hover:text-ink"}`}
              onClick={(event) => {
                event.preventDefault();
                onActiveChange(item.id);
                onSelect();

                window.history.replaceState(null, "", `#${item.id}`);
                const section = document.getElementById(item.id);
                if (section) {
                  const scrollElement = document.scrollingElement;
                  const targetOffset = getTocClickOffset(item.id, items);
                  const targetTop =
                    (scrollElement?.scrollTop ?? window.scrollY) +
                    section.getBoundingClientRect().top -
                    targetOffset;
                  const maxScrollTop = Math.max(
                    0,
                    (scrollElement?.scrollHeight ??
                      document.documentElement.scrollHeight) -
                      (window.visualViewport?.height ?? window.innerHeight),
                  );
                  window.scrollTo({
                    top: Math.min(maxScrollTop, Math.max(0, targetTop)),
                    behavior: "smooth",
                  });
                }
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
