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
    // The reading line, a quarter down the viewport: high enough that a part counts once its
    // heading is read, low enough that the square keeps up with the eye instead of trailing it.
    const line = innerHeight / 4;
    const tops = parts.map(({ heading }) => heading.getBoundingClientRect().top);
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    let index = 0;
    let progress = 0;
    if (atEnd) index = parts.length - 1;
    else
      for (const [at, top] of tops.entries()) {
        if (top > line) break;
        index = at;
        const next = tops[at + 1];
        progress = next === undefined ? 0 : Math.min(1, (line - top) / (next - top));
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
