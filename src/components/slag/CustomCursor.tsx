import { useEffect, useRef } from "react";
import { useStore } from "@/lib/slag/store";

/** Horizon's lerp-follow difference cursor. Desktop pointers only; toggle in the nav. */
export function CustomCursor() {
  const { ready, prefs } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const enabled = ready && prefs.cursor;

  useEffect(() => {
    if (!enabled) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;
    let mx = 0, my = 0, cx = 0, cy = 0, visible = false, raf = 0;
    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        cx = mx;
        cy = my;
        el.style.display = "block";
      }
    };
    const leave = () => { visible = false; el.style.display = "none"; };
    const loop = () => {
      cx += (mx - cx) * 0.2;
      cy += (my - cy) * 0.2;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    document.addEventListener("mousemove", move);
    document.documentElement.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(loop);
    return () => {
      document.removeEventListener("mousemove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={ref} aria-hidden className="pointer-events-none fixed top-0 left-0 z-[9999] hidden h-4 w-4 rounded-full bg-cursor mix-blend-difference" />;
}
