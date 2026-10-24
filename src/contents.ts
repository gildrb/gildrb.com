/**
 * Marks the part of the page being read in its contents list (`aside.tsx`) with `aria-current`,
 * which turns its link to full contrast. A click scrolls to its part without adding a history
 * entry, so Back leaves the page, and marks that part until the reader scrolls on their own: a
 * short part's heading can land past the reading line.
 */
export function trackContents(): void {
  const nav = document.querySelector<HTMLElement>("[data-contents]");
  if (!nav) return;
  const parts = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].flatMap((link) => {
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    return heading ? [{ link, heading }] : [];
  });
  if (parts.length === 0) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let current = -1;
  /** The part last clicked, held until the reader scrolls, presses a key or touches the page. */
  let chosen: number | null = null;
  let queued = false;

  for (const [at, { link, heading }] of parts.entries())
    link.addEventListener("click", (event) => {
      event.preventDefault();
      chosen = at;
      heading.scrollIntoView({ behavior: still.matches ? "instant" : "smooth" });
      history.replaceState(history.state, "", link.hash);
      update();
    });
  const release = () => {
    if (chosen === null) return;
    chosen = null;
    schedule();
  };
  for (const input of ["wheel", "touchstart", "keydown", "pointerdown"])
    addEventListener(input, release, { passive: true });

  const update = () => {
    queued = false;
    // A part is being read once its heading reaches the reading line, a quarter down the viewport.
    // Over the first screen of scrolling the line slides down from the viewport's top, and over the
    // last screen on to its bottom, so short parts at either end of a page get a fair share of the
    // scroll and every part is reached. A page shorter than two screens splits its scroll between
    // the two.
    const end = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const span = Math.min(innerHeight, end / 2);
    const rise = span > 0 ? Math.min(1, scrollY / span) : 1;
    const fall = span > 0 ? Math.min(1, Math.max(0, (scrollY - (end - span)) / span)) : 1;
    const line = (innerHeight / 4) * rise + ((innerHeight * 3) / 4) * fall;
    let index = chosen ?? 0;
    if (chosen === null)
      for (const [at, { heading }] of parts.entries())
        if (heading.getBoundingClientRect().top <= line) index = at;
    const part = parts[index];
    if (!part || index === current) return;
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
