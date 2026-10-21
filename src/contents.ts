// The browser's own animations (WAAPI) through Motion's small build: no animation engine to load.
import type { AnimationPlaybackControlsWithThen } from "motion";
import { animate } from "motion/mini";

/**
 * How the square moves to a new part: fast out, gentle in, no overshoot, within the 200ms an
 * interaction may take (interfaces.rauno.me). Every move has the same length and the same curve,
 * so it always looks the same.
 */
const glide = { duration: 0.18, ease: [0.2, 0, 0, 1] } as const;

/**
 * Marks the part of the page being read in its contents list (`aside.tsx`). The square stands still
 * on the part's link and only moves when the reader reaches another part: it glides there, and the
 * link turns to full contrast. A move that starts during another one starts from where the square
 * is, so it never jumps. Positions are measured from the links themselves, so the square stays on
 * its line at any font size. A click scrolls to its part without adding a history entry, so Back
 * leaves the page.
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
  let moving: AnimationPlaybackControlsWithThen | null = null;

  /** The square's offset that centers it on the first text line of a part's link. */
  const place = (link: HTMLAnchorElement) => {
    const style = getComputedStyle(link);
    const line = Number.parseFloat(style.lineHeight);
    const padding = Number.parseFloat(style.paddingTop);
    return `translateY(${link.offsetTop + padding + (line - marker.offsetHeight) / 2}px)`;
  };

  for (const { link, heading } of parts)
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: still.matches ? "instant" : "smooth" });
      history.replaceState(history.state, "", link.hash);
    });

  const update = () => {
    queued = false;
    // A part is being read once its heading reaches the reading line, a quarter down the viewport.
    // Parts near the end of a page can never get there, so their starts are pulled back into the
    // scroll range, a step apart, and every part is reached on the way down.
    const line = innerHeight / 4;
    const end = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const step = 64;
    const starts = parts.map(({ heading }) => heading.getBoundingClientRect().top + scrollY - line);
    for (let at = starts.length - 1; at >= 0; at -= 1) {
      const after = starts[at + 1];
      const limit = after === undefined ? end : after - step;
      starts[at] = Math.max(0, Math.min(starts[at] ?? 0, limit));
    }
    let index = 0;
    for (const [at, start] of starts.entries()) if (scrollY >= start) index = at;
    const part = parts[index];
    if (!part || index === current) return;
    const first = current === -1;
    current = index;
    for (const [at, { link }] of parts.entries()) {
      if (at === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    const target = place(part.link);
    // Freeze the square where it is now, mid-move or not, and move on from there.
    const from = getComputedStyle(marker).transform;
    moving?.stop();
    moving = null;
    marker.style.transform = target;
    if (first || still.matches || from === "none") return;
    const run = animate(marker, { transform: [from, target] }, glide);
    moving = run;
    void run.finished.then(() => {
      if (moving === run) moving = null;
    });
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", () => {
    current = -1;
    schedule();
  });
  update();
}
