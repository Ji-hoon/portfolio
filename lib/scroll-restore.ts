/**
 * Scroll restoration for list routes (`/`, `/projects`, `/archives`).
 *
 * A raw `scrollY` is meaningless once the layout reflows — the work grid is
 * 1/2/3 columns depending on viewport width, so the same pixel offset lands on
 * a different card after a resize. Snapshots therefore remember *which* piece
 * of content sat under the header (`anchorId` + its offset from the header) and
 * restore by putting that element back in the same place. Pixel values are kept
 * only as a fallback for when the anchor is no longer in the DOM.
 */

export const SCROLL_ANCHOR_ATTR = "data-scroll-anchor";

const STORAGE_PREFIX = "portfolio:scroll:";
/** Breathing room below the sticky header, so the anchor is not flush to it. */
const MARKER_GAP = 8;

export interface ScrollSnapshot {
  /** `data-scroll-anchor` of the element nearest the restore marker. */
  anchorId: string | null;
  /** Anchor top relative to the marker; negative when scrolled past it. */
  anchorOffset: number;
  /** Sticky header height when the snapshot was captured. */
  headerOffset: number;
  scrollY: number;
  /** `scrollY` as a share of the max scroll, for reflowed fallbacks. */
  scrollRatio: number;
  viewportWidth: number;
}

export interface RestoreResult {
  /** The anchor element was found, so the restore is content-accurate. */
  matched: boolean;
  /** The page is already at the target position. */
  settled: boolean;
}

export function getRouteKey(pathname: string, query: string) {
  return query ? `${pathname}?${query}` : pathname;
}

function getMaxScroll() {
  return Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    0,
  );
}

function getHeaderOffset() {
  return Math.max(
    document.querySelector("header")?.getBoundingClientRect().bottom ?? 0,
    0,
  );
}

/** Y coordinate the anchor is measured against — just below the sticky header. */
function getMarkerTop() {
  return getHeaderOffset() + MARKER_GAP;
}

function getAnchors() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[${SCROLL_ANCHOR_ATTR}]`),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * `html` sets `scroll-behavior: smooth`, so a restore must land in one frame
 * instead of triggering an animation that the next measurement could chase.
 * Direct `scrollTop` assignment avoids relying on CSS scroll behavior.
 */
function jumpTo(top: number) {
  // Direct scrollTop assignment is synchronous and does not depend on the
  // browser supporting the non-universal `behavior: "instant"` option.
  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = top;
  }
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

export function captureScrollSnapshot(preferredAnchor?: HTMLElement | null): ScrollSnapshot {
  const scrollY = window.scrollY;
  const maxScroll = getMaxScroll();
  const markerTop = getMarkerTop();

  let anchorId: string | null = null;
  let anchorOffset = 0;

  const preferredId = preferredAnchor?.getAttribute(SCROLL_ANCHOR_ATTR);
  if (preferredAnchor && preferredId) {
    anchorId = preferredId;
    anchorOffset = preferredAnchor.getBoundingClientRect().top - markerTop;
  }

  if (anchorId) {
    return {
      anchorId,
      anchorOffset,
      headerOffset: getHeaderOffset(),
      scrollY,
      scrollRatio: maxScroll > 0 ? scrollY / maxScroll : 0,
      viewportWidth: window.innerWidth,
    };
  }

  let bestDistance = Number.POSITIVE_INFINITY;

  for (const node of getAnchors()) {
    const id = node.getAttribute(SCROLL_ANCHOR_ATTR);
    if (!id) continue;

    const offset = node.getBoundingClientRect().top - markerTop;
    const distance = Math.abs(offset);
    if (distance < bestDistance) {
      bestDistance = distance;
      anchorId = id;
      anchorOffset = offset;
    }
  }

  return {
    anchorId,
    anchorOffset,
    headerOffset: getHeaderOffset(),
    scrollY,
    scrollRatio: maxScroll > 0 ? scrollY / maxScroll : 0,
    viewportWidth: window.innerWidth,
  };
}

export function applyScrollSnapshot(snapshot: ScrollSnapshot): RestoreResult {
  const maxScroll = getMaxScroll();

  if (snapshot.anchorId) {
    const anchor = getAnchors().find(
      (node) => node.getAttribute(SCROLL_ANCHOR_ATTR) === snapshot.anchorId,
    );

    if (anchor) {
      const currentOffset =
        anchor.getBoundingClientRect().top - getMarkerTop();
      const target = clamp(
        window.scrollY + currentOffset - snapshot.anchorOffset,
        0,
        maxScroll,
      );
      const delta = target - window.scrollY;
      if (Math.abs(delta) >= 1) jumpTo(target);
      return { matched: true, settled: Math.abs(delta) < 1 };
    }
  }

  // The anchor is gone (a list page that has not re-rendered its later pages
  // yet). A pixel offset is only meaningful at the width it was taken at, so
  // fall back proportionally once the viewport has changed.
  const baseTarget =
    snapshot.viewportWidth === window.innerWidth
      ? snapshot.scrollY
      : snapshot.scrollRatio * maxScroll;
  const target = clamp(
    baseTarget + snapshot.headerOffset - getHeaderOffset(),
    0,
    maxScroll,
  );
  const delta = target - window.scrollY;
  if (Math.abs(delta) >= 1) jumpTo(target);
  return { matched: false, settled: Math.abs(delta) < 1 };
}

export function saveScrollSnapshot(
  routeKey: string,
  snapshot: ScrollSnapshot,
) {
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + routeKey,
      JSON.stringify(snapshot),
    );
  } catch {
    // Storage can be unavailable (private mode, quota); restoration is optional.
  }
}

export function readScrollSnapshot(routeKey: string): ScrollSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + routeKey);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Partial<ScrollSnapshot>;
    if (typeof value.scrollY !== "number") return null;

    return {
      anchorId: typeof value.anchorId === "string" ? value.anchorId : null,
      anchorOffset:
        typeof value.anchorOffset === "number" ? value.anchorOffset : 0,
      headerOffset:
        typeof value.headerOffset === "number"
          ? value.headerOffset
          : getHeaderOffset(),
      scrollY: value.scrollY,
      scrollRatio:
        typeof value.scrollRatio === "number" ? value.scrollRatio : 0,
      viewportWidth:
        typeof value.viewportWidth === "number"
          ? value.viewportWidth
          : window.innerWidth,
    };
  } catch {
    return null;
  }
}

export function clearScrollSnapshot(routeKey: string) {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + routeKey);
  } catch {
    // See saveScrollSnapshot.
  }
}
