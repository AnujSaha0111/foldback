import type { PointerEvent, RefObject } from "react";

/**
 * Tilts a panel toward the mouse (up to 4° by 3°) and moves a soft light with it, by writing --rx, --ry, --mx and
 * --my. Never for touch, never under reduced motion. Leaving lets the panel settle back over 900 ms.
 */
export function useLean(ref: RefObject<HTMLDivElement | null>) {
  const lean = (event: PointerEvent<HTMLDivElement>) => {
    const panel = ref.current;
    if (!panel || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = panel.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    panel.dataset.tracking = "true";
    panel.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    panel.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    panel.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
    panel.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
  };
  const settle = () => {
    const panel = ref.current;
    if (!panel) return;
    panel.dataset.tracking = "false";
    panel.style.setProperty("--rx", "0deg");
    panel.style.setProperty("--ry", "0deg");
  };
  return { lean, settle };
}
