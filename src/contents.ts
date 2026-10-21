/**
 * Marks the part of the page being read in its contents list (`aside.tsx`). The square follows the
 * scroll itself: between two headings it stands as far from one link to the next as the reading
 * line has come from one heading to the next, so it never lags and never jumps. The link of the
 * part the line is in turns to full contrast. A click scrolls to its part without adding a history
 * entry, so Back leaves the page.
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
        next === undefined || next <= start ? 0 : Math.min(1, (scrollY - start) / (next - start));
    }
    const from = parts[index]?.link.offsetTop ?? 0;
    const to = parts[index + 1]?.link.offsetTop ?? from;
    marker.style.transform = `translateY(${from + (to - from) * progress}px)`;
    if (index === current) return;
    current = index;
    for (const [at, { link }] of parts.entries()) {
      if (at === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
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
