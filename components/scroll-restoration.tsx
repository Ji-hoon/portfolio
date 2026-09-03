"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  applyScrollSnapshot,
  captureScrollSnapshot,
  clearScrollSnapshot,
  getRouteKey,
  readScrollSnapshot,
  saveScrollSnapshot,
  SCROLL_ANCHOR_ATTR,
  type ScrollSnapshot,
} from "@/lib/scroll-restore";

const DETAIL_PATHNAME = "/detail";
/**
 * Anchors can land a frame or two late — a list page re-renders its cached
 * infinite pages, sections stream in — so the restore re-applies across a short
 * frame burst instead of firing once, then holds the position by watching the
 * document height until the page has stopped moving.
 */
const RESTORE_FRAME_MS = 400;
const RESTORE_SETTLE_MS = 2000;

type TrackedSnapshot = { routeKey: string; snapshot: ScrollSnapshot };

/**
 * Route scroll policy:
 *  - a `#hash` target always wins — Contact must land on the Contact section;
 *  - coming back from a detail page restores the list to where it was when the
 *    detail page was opened;
 *  - anything else (nav clicks, logo, reload) goes to the top, as before.
 *
 * See `lib/scroll-restore.ts` for why the position is stored as a content
 * anchor rather than a pixel offset.
 */
export default function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const routeKey = getRouteKey(pathname, query);

  const previousPathnameRef = useRef<string | null>(null);
  const latestRef = useRef<TrackedSnapshot | null>(null);
  const historyTraversalRef = useRef(false);

  useEffect(() => {
    const markHistoryTraversal = () => {
      historyTraversalRef.current = true;
    };

    // Next 16 intercepts back/forward through the Navigation API where the
    // browser has it, and commits the new route BEFORE popstate fires — a
    // popstate flag would always arrive one navigation late (and then leak
    // into the next non-traversal navigation). `navigate` fires at traversal
    // start, so listen to it when available; popstate stays as the fallback
    // for browsers without the API, where Next still routes via popstate.
    const navigation = (
      window as unknown as { navigation?: EventTarget }
    ).navigation;
    if (navigation) {
      const onNavigate = (event: Event) => {
        if (
          (event as Event & { navigationType?: string }).navigationType ===
          "traverse"
        ) {
          markHistoryTraversal();
        }
      };
      navigation.addEventListener("navigate", onNavigate);
      return () => navigation.removeEventListener("navigate", onNavigate);
    }

    window.addEventListener("popstate", markHistoryTraversal);
    return () => window.removeEventListener("popstate", markHistoryTraversal);
  }, []);

  // Track the live position, and hand it to storage when the route is left.
  useEffect(() => {
    const record = (event?: Event) => {
      const clickedAnchor =
        event?.target instanceof Element
          ? event.target.closest<HTMLElement>(`[${SCROLL_ANCHOR_ATTR}]`)
          : null;
      const tracked = {
        routeKey,
        snapshot: captureScrollSnapshot(clickedAnchor),
      };
      latestRef.current = tracked;

      // Persist the clicked card immediately. Route cleanup can run after the
      // next route has started rendering, so the cleanup-only save is not a
      // reliable place to retain the exact entry card.
      if (clickedAnchor) saveScrollSnapshot(routeKey, tracked.snapshot);
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        record();
      });
    };

    // Layout can shift after the last scroll event (a font swap, an image, a
    // late section). Without re-measuring, the stored anchor offset would be
    // taken against a layout that no longer exists.
    const observer = new ResizeObserver(onScroll);

    record();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    observer.observe(document.body);
    // Measure synchronously on the click that starts the navigation. The
    // throttled listeners can be a layout shift behind by then, and this is
    // exactly the moment the snapshot is supposed to describe.
    document.addEventListener("click", record, true);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("click", record, true);

      // Read from the ref rather than the DOM: by cleanup time the next route
      // is already committed and measuring would capture the wrong page.
      if (latestRef.current?.routeKey === routeKey) {
        saveScrollSnapshot(routeKey, latestRef.current.snapshot);
      }
    };
  }, [routeKey]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    const isHistoryTraversal = historyTraversalRef.current;
    historyTraversalRef.current = false;

    const record = () => {
      latestRef.current = { routeKey, snapshot: captureScrollSnapshot() };
    };

    // An explicit hash destination outranks restoration: the hash is not part
    // of the route key, so `/` and `/#contact` would otherwise share a snapshot.
    const hasHashTarget = window.location.hash.length > 1;
    const snapshot =
      !hasHashTarget &&
      isHistoryTraversal &&
      previousPathname === DETAIL_PATHNAME &&
      isListPathname(pathname)
        ? readScrollSnapshot(routeKey)
        : null;

    if (!snapshot) {
      // Fresh entry: reset, and drop any position left over from an earlier visit.
      clearScrollSnapshot(routeKey);
      const cancel = restoreRouteTarget();
      return () => {
        cancel();
        record();
      };
    }

    let frame = 0;
    let settleTimer = 0;
    let stopped = false;

    const reapply = () => {
      if (stopped) return;
      applyScrollSnapshot(snapshot);
      record();
    };

    // Anything that changes the page height moves the anchor, so re-pin on it.
    // This is what catches the late shifts a fixed frame budget misses — a web
    // font swapping in, an image settling, another infinite page arriving.
    // `body` is the one that actually reports growth: `documentElement` keeps
    // reporting the viewport box, so observing it alone misses the resize.
    const observer = new ResizeObserver(reapply);

    const stop = () => {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      window.clearTimeout(settleTimer);
      observer.disconnect();
      for (const event of USER_SCROLL_EVENTS) {
        window.removeEventListener(event, stop);
      }
    };

    // A short frame burst converges on the target; the observer keeps it there.
    const frameDeadline = performance.now() + RESTORE_FRAME_MS;
    const step = () => {
      if (stopped) return;
      reapply();
      if (performance.now() >= frameDeadline) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(step);
    };

    // Any deliberate input outranks the restore.
    for (const event of USER_SCROLL_EVENTS) {
      window.addEventListener(event, stop, { passive: true });
    }
    settleTimer = window.setTimeout(stop, RESTORE_SETTLE_MS);
    observer.observe(document.body);
    observer.observe(document.documentElement);
    step();

    return stop;
  }, [pathname, routeKey]);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return null;
}

const USER_SCROLL_EVENTS = [
  "wheel",
  "touchstart",
  "keydown",
  "pointerdown",
] as const;

function scrollToRouteTarget() {
  const target = getHashTarget();

  if (target) {
    const targetTop = Math.max(
      0,
      window.scrollY +
        target.getBoundingClientRect().top -
        getHeaderOffset(),
    );
    jumpTo(targetTop);
    return;
  }

  jumpTo(0);
}

function restoreRouteTarget() {
  // No hash: a single instant jump to the top, as before.
  if (window.location.hash.length <= 1) {
    scrollToRouteTarget();
    return () => {};
  }

  // A hash section can stream in well after commit (the page's data resolves
  // on the server first), and content above it keeps settling after that — so
  // wait for the element within the settle window, then hold the position with
  // the same frame-burst + resize pinning the snapshot restore uses. Deliberate
  // user input outranks the hold.
  let frame = 0;
  let frameDeadline = 0;
  let stopped = false;
  let found = false;

  const observer = new ResizeObserver(() => {
    if (found && !stopped) scrollToRouteTarget();
  });

  const stop = () => {
    stopped = true;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    window.clearTimeout(settleTimer);
    observer.disconnect();
    for (const event of USER_SCROLL_EVENTS) {
      window.removeEventListener(event, stop);
    }
  };

  const settleTimer = window.setTimeout(() => {
    // The anchor never appeared (broken hash): fall back to the top, as before.
    if (!found) scrollToRouteTarget();
    stop();
  }, RESTORE_SETTLE_MS);

  const step = () => {
    if (stopped) return;
    if (!found) {
      if (!getHashTarget()) {
        frame = window.requestAnimationFrame(step);
        return;
      }
      found = true;
      frameDeadline = performance.now() + RESTORE_FRAME_MS;
      observer.observe(document.body);
      observer.observe(document.documentElement);
    }
    scrollToRouteTarget();
    frame =
      performance.now() < frameDeadline
        ? window.requestAnimationFrame(step)
        : 0;
  };

  for (const event of USER_SCROLL_EVENTS) {
    window.addEventListener(event, stop, { passive: true });
  }
  step();
  return stop;
}

function getHashTarget() {
  const hash = window.location.hash;
  if (!hash) return null;

  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

function getHeaderOffset() {
  return Math.max(
    document.querySelector("header")?.getBoundingClientRect().bottom ?? 0,
    0,
  );
}

function jumpTo(top: number) {
  const maxScrollTop = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    0,
  );
  const clampedTop = Math.min(Math.max(top, 0), maxScrollTop);
  // `html`의 scroll-behavior: smooth 아래에서 scrollTop 대입은 애니메이션이
  // 되고, 라우터의 자체 스크롤과 경합하면 중간에 취소되어 엉뚱한 위치에
  // 멈춘다 — 라우트 스크롤은 instant로 동기 착지시킨다.
  window.scrollTo({ top: clampedTop, behavior: "instant" });
}

function isListPathname(pathname: string) {
  return pathname === "/" || pathname === "/projects" || pathname === "/archives";
}
