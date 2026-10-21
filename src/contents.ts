// The browser's own animations (WAAPI) through Motion's small build: no animation engine to load.
import { animate } from "motion/mini";

/** Fast enough to feel immediate, long enough to read as a move (see interfaces.rauno.me). */
const move = { duration: 0.18, ease: [0.2, 0, 0, 1] } as const;

/**
 * Marks the part of the page being read in its contents list (`Contents` in `aside.tsx`): its link
 * turns to full contrast and the square glides beside it. A part is being read once its heading
 * has passed the top third of the viewport; at the end of the page the last part is.
 */
export function trackContents(): void {
  const nav = document.querySelector<HTMLElement>("[data-contents]");
  const marker = nav?.querySelector<HTMLElement>("[data-contents-marker]");
  if (!nav || !marker) return;
  const parts = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].flatMap((link) => {
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    return heading ? [{ link, heading }] : [];
  });
  if (parts.length === 0) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let current = -1;
  let queued = false;

  const update = () => {
    queued = false;
    const line = innerHeight / 3;
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    let index = atEnd ? parts.length - 1 : -1;
    if (!atEnd)
      for (const [at, { heading }] of parts.entries())
        if (heading.getBoundingClientRect().top <= line) index = at;
    if (index === current) return;
    const before = current;
    current = index;
    for (const [at, { link }] of parts.entries()) {
      if (at === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    const part = parts[index];
    if (!part) {
      animate(marker, { opacity: 0 }, { duration: still.matches ? 0 : 0.12 });
      return;
    }
    // Centered on the link's first line (24px), whatever the list's own offsets are.
    const y = part.link.offsetTop + (24 - marker.offsetHeight) / 2;
    if (before === -1 || still.matches) {
      marker.style.transform = `translateY(${y}px)`;
      animate(marker, { opacity: 1 }, { duration: still.matches ? 0 : 0.12 });
    } else {
      animate(marker, { transform: `translateY(${y}px)`, opacity: 1 }, move);
    }
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
}
