// The browser's own animations (WAAPI) through Motion's small build, with Motion's spring.
import { type AnimationPlaybackControlsWithThen, spring } from "motion";
import { animate } from "motion/mini";

/**
 * How the square moves to the next part: a quick spring with a little give, done in about the
 * 200ms an interaction may take (interfaces.rauno.me).
 */
const snap = { type: spring, visualDuration: 0.18, bounce: 0.25 } as const;

/** How far the square leans toward the next part before it snaps there: a fifth of the way. */
const lean = 0.2;

/**
 * Marks the part of the page being read in its contents list (`aside.tsx`). The square sits on the
 * part's link and leans a little toward the next one as the reader scrolls through the part; when
 * the next part begins, it snaps there on a spring, and the link turns to full contrast. Positions
 * are measured from the links themselves, so the square stays on its line at any font size. A
 * click scrolls to its part without adding a history entry, so Back leaves the page.
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
  let snapping: AnimationPlaybackControlsWithThen | null = null;
  let target = "";

  /** The square's offset that centers it on the first text line of a part's link. */
  const place = (link: HTMLAnchorElement) => {
    const style = getComputedStyle(link);
    const line = Number.parseFloat(style.lineHeight);
    const padding = Number.parseFloat(style.paddingTop);
    return link.offsetTop + padding + (line - marker.offsetHeight) / 2;
  };

  for (const { link, heading } of parts)
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: still.matches ? "instant" : "smooth" });
      history.replaceState(history.state, "", link.hash);
    });

  const update = () => {
    queued = false;
    // Where each part begins, in scroll position: once its heading reaches the reading line, a
    // quarter down the viewport. Parts near the end of a page can never get there, so they are
    // pulled back into the scroll range, a step apart, and every part is reached on the way down.
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
    let progress = 0;
    for (const [at, start] of starts.entries()) {
      if (scrollY < start && at > 0) break;
      index = at;
      const next = starts[at + 1];
      progress =
        next === undefined || next <= start
          ? 0
          : Math.min(1, Math.max(0, (scrollY - start) / (next - start)));
    }
    const part = parts[index];
    if (!part) return;
    const from = place(part.link);
    const next = parts[index + 1];
    const to = next === undefined ? from : place(next.link);
    target = `translateY(${from + (to - from) * lean * progress}px)`;
    if (index === current) {
      if (snapping === null) marker.style.transform = target;
      return;
    }
    const first = current === -1;
    current = index;
    for (const [at, { link }] of parts.entries()) {
      if (at === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    snapping?.stop();
    snapping = null;
    if (first || still.matches) {
      marker.style.transform = target;
      return;
    }
    const run = animate(marker, { transform: target }, snap);
    snapping = run;
    void run.finished.then(() => {
      if (snapping !== run) return;
      snapping = null;
      marker.style.transform = target;
    });
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
