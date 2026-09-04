"use client";

import Image from "next/image";
import { LuChevronLeft, LuChevronRight, LuImage, LuX } from "react-icons/lu";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from "react";

const ROTATION_INTERVAL = 1800;
type SwipeTarget = "detail" | "overlay";
type Direction = -1 | 1;

export default function WorkImageCarousel({
  images,
  alt,
  detail = false,
  hovered,
}: {
  images: string[];
  alt: string;
  detail?: boolean;
  hovered?: boolean;
}) {
  const slides = images.filter(Boolean);
  const hasMultiple = slides.length > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const [overlayIndex, setOverlayIndex] = useState(0);
  const [detailVisibleCount, setDetailVisibleCount] = useState(1);
  const [selfHovered, setSelfHovered] = useState(false);
  /* 로딩 완료된 src 추적 — 미완료 슬라이드는 스켈레톤(펄스 + 아이콘)을 보여주고,
     디테일 호버 틴트도 로딩 완료 후에만 켠다 (파란 박스가 먼저 비치지 않도록) */
  const [loadedSrcs, setLoadedSrcs] = useState<Set<string>>(new Set());
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchTargetRef = useRef<SwipeTarget | null>(null);
  const didSwipeRef = useRef(false);
  const [touchOffset, setTouchOffset] = useState(0);
  const [isTouching, setIsTouching] = useState(false);
  const [touchTarget, setTouchTarget] = useState<SwipeTarget | null>(null);
  const isHovered = hovered ?? selfHovered;
  const maxDetailIndex = Math.max(slides.length - detailVisibleCount, 0);
  const canNavigateDetail = detail && slides.length > detailVisibleCount;
  const isSingleColumnDetail = detail && detailVisibleCount === 1;
  const showDetailImageCount = isSingleColumnDetail;
  const showDetailControls = canNavigateDetail && detailVisibleCount > 1;
  const canOpenOverlay = detail && slides.length > 0;
  const boundedActiveIndex = Math.min(activeIndex, maxDetailIndex);
  const visibleCardIndex = !detail && isHovered ? activeIndex : 0;

  useEffect(() => {
    if (!detail) return;

    const updateVisibleCount = () => {
      setDetailVisibleCount(
        window.innerWidth <= 640 ? 1 : window.innerWidth <= 960 ? 3 : 4,
      );
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, [detail]);

  useEffect(() => {
    if (!hasMultiple || detail || !isHovered) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, ROTATION_INTERVAL);

    return () => window.clearInterval(timer);
  }, [detail, hasMultiple, isHovered, slides.length]);

  const moveDetail = (direction: -1 | 1) => {
    setActiveIndex((current) => {
      const next = Math.min(current, maxDetailIndex) + direction;
      if (next > maxDetailIndex) return 0;
      if (next < 0) return maxDetailIndex;
      return next;
    });
  };

  const moveOverlay = useCallback(
    (direction: Direction) => {
      const next = (overlayIndex + direction + slides.length) % slides.length;
      setOverlayIndex(next);
      if (isSingleColumnDetail) setActiveIndex(next);
    },
    [isSingleColumnDetail, overlayIndex, slides.length],
  );

  useEffect(() => {
    if (!isOverlayOpen || !canOpenOverlay) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOverlayOpen(false);
      /* 좌우 화살표 순환 탐색 — 키보드가 있는 비모바일 환경에서만 발생한다 */
      if (!hasMultiple) return;
      if (event.key === "ArrowLeft") moveOverlay(-1);
      if (event.key === "ArrowRight") moveOverlay(1);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [canOpenOverlay, hasMultiple, isOverlayOpen, moveOverlay]);

  const moveDetailBySwipe = (direction: Direction) => {
    setActiveIndex((current) =>
      Math.max(
        0,
        Math.min(Math.min(current, maxDetailIndex) + direction, maxDetailIndex),
      ),
    );
  };

  const moveOverlayBySwipe = (direction: Direction) => {
    const next = Math.max(
      0,
      Math.min(overlayIndex + direction, slides.length - 1),
    );
    setOverlayIndex(next);
    if (isSingleColumnDetail) setActiveIndex(next);
  };

  const handleTouchStart = (event: TouchEvent, target: SwipeTarget) => {
    if (!hasMultiple) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchTargetRef.current = target;
    didSwipeRef.current = false;
    setTouchOffset(0);
    setIsTouching(true);
    setTouchTarget(target);
  };

  const handleTouchMove = (event: TouchEvent, target: SwipeTarget) => {
    if (touchTargetRef.current !== target) return;
    const start = touchStartRef.current;
    if (!start) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    event.preventDefault();
    const currentIndex =
      target === "overlay" ? overlayIndex : boundedActiveIndex;
    const maxIndex = target === "overlay" ? slides.length - 1 : maxDetailIndex;
    const atStart = currentIndex === 0 && deltaX > 0;
    const atEnd = currentIndex === maxIndex && deltaX < 0;
    setTouchOffset(atStart || atEnd ? 0 : deltaX);
  };

  const handleTouchEnd = (
    event: TouchEvent,
    target: SwipeTarget,
    onSwipe: (direction: Direction) => void,
  ) => {
    if (touchTargetRef.current !== target) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    touchTargetRef.current = null;
    setTouchOffset(0);
    setIsTouching(false);
    setTouchTarget(null);
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    didSwipeRef.current = true;
    onSwipe(deltaX > 0 ? -1 : 1);
  };

  if (slides.length === 0) return null;

  const trackOffset = detail
    ? boundedActiveIndex * (100 / detailVisibleCount)
    : visibleCardIndex * 100;

  return (
    <>
      <div
        className={`relative w-full overflow-hidden ${detail ? "aspect-video min-[641px]:aspect-[48/9] min-[961px]:aspect-[64/9] touch-pan-y bg-transparent" : "aspect-video bg-surface"}`}
        onMouseEnter={() => {
          if (!detail && !isHovered) setActiveIndex(0);
          if (hovered === undefined) setSelfHovered(true);
        }}
        onMouseLeave={() => {
          if (hovered === undefined) setSelfHovered(false);
        }}
        onTouchStart={
          isSingleColumnDetail
            ? (event) => handleTouchStart(event, "detail")
            : undefined
        }
        onTouchMove={
          isSingleColumnDetail
            ? (event) => handleTouchMove(event, "detail")
            : undefined
        }
        onTouchEnd={
          isSingleColumnDetail
            ? (event) => handleTouchEnd(event, "detail", moveDetailBySwipe)
            : undefined
        }
        role={hasMultiple ? "region" : undefined}
        aria-roledescription={hasMultiple ? "carousel" : undefined}
        aria-label={hasMultiple ? `${alt} images` : undefined}
      >
        <div
          className={`flex h-full w-full ${isTouching && touchTarget === "detail" ? "transition-none" : "transition-transform duration-500 ease-out"}`}
          style={{
            transform: `translateX(calc(-${trackOffset}% + ${isTouching && touchTarget === "detail" ? touchOffset : 0}px))`,
          }}
        >
          {slides.map((src, index) => (
            <div
              key={src}
              className={`relative h-full shrink-0 ${detail ? `group/media bg-surface ${loadedSrcs.has(src) ? "hover:bg-[#2563eb]" : ""}` : ""}`}
              style={
                detail
                  ? { width: `${100 / detailVisibleCount}%` }
                  : { width: "100%" }
              }
            >
              {!loadedSrcs.has(src) && (
                <div className="pointer-events-none absolute inset-0 flex animate-pulse items-center justify-center bg-surface">
                  <LuImage aria-hidden size={28} className="text-muted/50" />
                </div>
              )}
              <Image
                src={src}
                alt={`${alt} (${index + 1}/${slides.length})`}
                fill
                priority={detail && index === 0}
                sizes={
                  detail
                    ? "(max-width: 640px) 100vw, (max-width: 960px) 33vw, 25vw"
                    : "(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
                }
                className={`object-cover transition-opacity duration-300 ${loadedSrcs.has(src) ? "" : "opacity-0"} ${canOpenOverlay ? "cursor-pointer" : ""} ${detail ? "group-hover/media:opacity-70" : ""}`}
                onLoad={() =>
                  setLoadedSrcs((prev) =>
                    prev.has(src) ? prev : new Set(prev).add(src),
                  )
                }
                onClick={(event) => {
                  if (!canOpenOverlay) return;
                  if (didSwipeRef.current) {
                    didSwipeRef.current = false;
                    return;
                  }
                  event.stopPropagation();
                  setOverlayIndex(index);
                  if (isSingleColumnDetail) setActiveIndex(index);
                  setIsOverlayOpen(true);
                }}
              />
            </div>
          ))}
        </div>

        {hasMultiple && !detail && (
          /* 진행 바는 호버에만 하단에서 올라온다. 지나간 구간은 스냅으로 채우고,
             현재 구간은 로테이션 간격만큼 linear로 채워 이미지 전환 순간과 만난다.
             세그먼트는 key 리마운트로 인덱스 틱마다 애니메이션을 다시 시작한다.
             호버가 없는 터치 기기(pointer-coarse)에서는 제공하지 않는다. */
          <div
            className={`absolute inset-x-0 bottom-0 z-10 flex h-1 bg-black/15 transition-transform duration-300 ease-out pointer-coarse:hidden ${isHovered ? "translate-y-0" : "translate-y-full"}`}
          >
            <div
              className="h-full bg-ink"
              style={{
                width: `${(visibleCardIndex / slides.length) * 100}%`,
              }}
            />
            <div
              key={visibleCardIndex}
              className="h-full origin-left bg-ink"
              style={{
                width: `${100 / slides.length}%`,
                transform: "scaleX(0)",
                animation: isHovered
                  ? `card-progress ${ROTATION_INTERVAL}ms linear forwards`
                  : undefined,
              }}
            />
          </div>
        )}

        {showDetailControls && (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 justify-between">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                moveDetail(-1);
              }}
              aria-label="Previous image"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
            >
              <LuChevronLeft aria-hidden size={18} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                moveDetail(1);
              }}
              aria-label="Next image"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
            >
              <LuChevronRight aria-hidden size={18} />
            </button>
          </div>
        )}

        {showDetailImageCount && (
          <div
            className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white"
            aria-label={`Image ${boundedActiveIndex + 1} of ${slides.length}`}
          >
            {boundedActiveIndex + 1}/{slides.length}
          </div>
        )}
      </div>

      {isOverlayOpen && canOpenOverlay && (
        <div
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black/95 p-4 md:p-8"
          role="dialog"
          aria-label={`${alt} image viewer`}
          aria-modal="true"
          onClick={() => setIsOverlayOpen(false)}
        >
          <button
            type="button"
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white md:right-8 md:top-8"
            onClick={() => setIsOverlayOpen(false)}
          >
            <LuX aria-hidden size={20} />
          </button>

          <div
            className="relative h-full w-full max-w-[1400px] cursor-default touch-pan-y overflow-hidden"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => handleTouchStart(event, "overlay")}
            onTouchMove={(event) => handleTouchMove(event, "overlay")}
            onTouchEnd={(event) =>
              handleTouchEnd(event, "overlay", moveOverlayBySwipe)
            }
          >
            <div
              className={`flex h-full w-full ${isTouching && touchTarget === "overlay" ? "transition-none" : "transition-transform duration-500 ease-out"}`}
              style={{
                transform: `translateX(calc(-${overlayIndex * 100}% + ${isTouching && touchTarget === "overlay" ? touchOffset : 0}px))`,
              }}
            >
              {slides.map((src, index) => (
                <div key={src} className="relative h-full w-full shrink-0">
                  <Image
                    src={src}
                    alt={`${alt} (${index + 1}/${slides.length})`}
                    fill
                    sizes="100vw"
                    className="object-contain p-8 md:p-16"
                  />
                </div>
              ))}
            </div>

            {hasMultiple && (
              <>
                <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/25">
                  <div
                    className="h-full bg-white transition-[width] duration-500 ease-out"
                    style={{
                      width: `${((overlayIndex + 1) / slides.length) * 100}%`,
                    }}
                  />
                </div>
                {/* Nav buttons hide only on touch-primary (mobile) devices,
                    where swipe is the navigation gesture. */}
                <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 flex -translate-y-1/2 justify-between pointer-coarse:hidden md:inset-x-4">
                  <button
                    type="button"
                    onClick={() => moveOverlay(-1)}
                    aria-label="Previous image"
                    className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
                  >
                    <LuChevronLeft aria-hidden size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOverlay(1)}
                    aria-label="Next image"
                    className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-white"
                  >
                    <LuChevronRight aria-hidden size={19} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
