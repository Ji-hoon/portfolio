"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ui } from "@/lib/i18n";
import { workCache } from "@/lib/work-cache";
import { useLanguageStore } from "@/lib/language-store";
import Reveal from "./reveal";
import WorkCard from "./work-card";

type Variant = "projects" | "archives";

export default function WorkSection({
  variant,
  preview = false,
}: {
  variant: Variant;
  preview?: boolean;
}) {
  const lang = useLanguageStore((state) => state.lang);
  const section = ui.sections[variant];

  return (
    <section
      id={variant}
      data-scroll-anchor={`section:${variant}`}
      className="mb-32 scroll-mt-28 md:mb-48"
    >
      <Reveal className="mb-8 flex items-baseline gap-3">
        <h2 className="text-sm font-semibold">{section.title[lang]}</h2>
        <p className="text-sm text-muted">{section.description[lang]}</p>
      </Reveal>

      {/* The query component stays behind Suspense so the section shell
          prerenders; hydrated data resolves it instantly on the client. */}
      <Suspense fallback={<GridSkeleton variant={variant} preview={preview} />}>
        <WorkGrid variant={variant} preview={preview} />
      </Suspense>
    </section>
  );
}

function WorkGrid({
  variant,
  preview,
}: {
  variant: Variant;
  preview: boolean;
}) {
  if (!preview) return <InfiniteWorkGrid variant={variant} />;

  return <PreviewWorkGrid variant={variant} />;
}

function PreviewWorkGrid({ variant }: { variant: Variant }) {
  const { data: items } = useSuspenseQuery(workCache.listOptions(variant));
  const lang = useLanguageStore((state) => state.lang);
  const visibleItems = items.slice(0, 3);

  return (
    <>
      <Reveal className="grid grid-cols-1 gap-6 md:gap-8">
        {/*  min-[641px]:grid-cols-2 min-[961px]:grid-cols-3 */}
        {visibleItems.map((item, index) => (
          <WorkCard
            key={item.id}
            item={item}
            showDivider={index > 0}
            showImage={false}
          />
        ))}
      </Reveal>
      {items.length > visibleItems.length && (
        <Reveal className="mt-8 flex justify-center">
          <Link
            href={`/${variant}`}
            className="inline-flex w-full text-center justify-center items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors bg-gray-100 hover:bg-gray-200"
          >
            {ui.more[lang]}
            <span aria-hidden>↗</span>
          </Link>
        </Reveal>
      )}
    </>
  );
}

function InfiniteWorkGrid({ variant }: { variant: Variant }) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(workCache.infiniteListOptions(variant));
  const items = data.pages.flatMap((page) => page.items);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "0px 0px 320px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <Reveal className="grid grid-cols-1 gap-6 min-[641px]:grid-cols-2 min-[961px]:grid-cols-3 md:gap-8">
        {items.map((item) => (
          <WorkCard key={item.id} item={item} showImage />
        ))}
      </Reveal>
      <div
        ref={loadMoreRef}
        className="flex min-h-14 items-center justify-center"
        aria-live="polite"
      >
        {isFetchingNextPage ? (
          <span
            aria-label="Loading more"
            className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
          />
        ) : null}
      </div>
    </>
  );
}

const SKELETON_LAYOUTS: Record<Variant, string[]> = {
  projects: Array(8).fill("aspect-video"),
  archives: Array(8).fill("aspect-video"),
};

function GridSkeleton({
  variant,
  preview,
}: {
  variant: Variant;
  preview: boolean;
}) {
  const layouts = SKELETON_LAYOUTS[variant].slice(0, 3);

  return (
    <div className="grid animate-pulse grid-cols-1 gap-6 min-[641px]:grid-cols-2 min-[961px]:grid-cols-3 md:gap-8">
      {layouts.map((layout, index) =>
        preview ? (
          <div
            key={index}
            className="flex flex-col gap-2 border-t border-ink/10 pt-4"
          >
            <div className="h-7 w-2/3 bg-surface" />
            <div className="h-5 w-full bg-surface" />
          </div>
        ) : (
          <div key={index} className={`flex flex-col gap-3 ${layout}`}>
            <div className="h-full w-full bg-surface" />
            <div className="h-4 w-2/3 bg-surface" />
          </div>
        ),
      )}
    </div>
  );
}
