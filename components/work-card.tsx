"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkItem } from "@/lib/content";
import { useLanguageStore } from "@/lib/language-store";
import WorkImageCarousel from "./work-image-carousel";

export default function WorkCard({
  item,
  showDivider = false,
  showImage = true,
}: {
  item: WorkItem;
  showDivider?: boolean;
  showImage?: boolean;
}) {
  const lang = useLanguageStore((state) => state.lang);
  const images = [
    ...(item.image ? [item.image] : []),
    ...(item.subImages ?? []),
  ];
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const resetHover = () => setIsHovered(false);
    window.addEventListener("popstate", resetHover);
    window.addEventListener("pageshow", resetHover);

    return () => {
      window.removeEventListener("popstate", resetHover);
      window.removeEventListener("pageshow", resetHover);
    };
  }, []);

  return (
    <Link
      href={`/detail?id=${item.id}`}
      /* Restore anchor: the list returns to this card after a detail visit. */
      data-scroll-anchor={`work:${item.id}`}
      className={`work-card group flex cursor-pointer flex-col gap-3 ${showDivider ? "border-t border-ink/10 pt-6" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered(false)}
    >
      {showImage ? (
        <WorkImageCarousel
          images={images}
          alt={item.title[lang]}
          hovered={isHovered}
        />
      ) : null}
      <div>
        <div>
          <h3
            className={`${showImage ? "text-base md:text-lg" : "text-xl md:text-2xl"} font-bold text-ink`}
          >
            {item.title[lang]}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="text-xs font-medium tracking-wide">
              {item.category}
            </span>
            <span aria-hidden>·</span>
            <span>{item.year}</span>
          </div>
        </div>
        <p
          className={`${showImage ? "text-xs" : "text-sm md:text-base"} mt-1 text-muted`}
        >
          {item.summary[lang]}
        </p>
      </div>
    </Link>
  );
}
