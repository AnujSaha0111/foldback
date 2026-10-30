import { useEffect } from "react";
import type { RefObject } from "react";

/** How far an element has travelled through the viewport, 0 entering at the bottom, 1 leaving at the top. */
export function scrollProgress(top: number, height: number, viewport: number): number {
  return Math.max(0, Math.min(1, (viewport - top) / (viewport + height)));
}

const NEARBY = 200;

/**
 * Writes one number, `--p`, onto the element as it scrolls. All motion is CSS that reads it, so there is no animation
 * library. Under reduced motion it writes nothing and the CSS default rests the scene in its composed state.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let queued = false;
    const update = () => {
      queued = false;
      const { top, bottom, height } = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      if (bottom < -NEARBY || top > viewport + NEARBY) return;
      element.style.setProperty("--p", scrollProgress(top, height, viewport).toFixed(4));
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);
}
