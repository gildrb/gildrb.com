import { smear } from "./smear.ts";

/** The space between a link's last letter and the square. */
const spacing = 8;

/**
 * Marks the part of the page being read in its contents list (`aside.tsx`). The square stands still
 * just right of the part's link text and only moves when the reader reaches another part: it
 * smears there, and the link turns to full contrast. A move that starts during another one
 * carries on from where the square is and how fast it goes, so it never jumps. Positions are
 * measured from the links' text, so the square stays beside its words at any font size. A click
 * scrolls to its part without adding a history entry, so Back leaves the page, and marks that part
 * until the reader scrolls on their own: a short part's heading can land past the reading line.
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
  /** The part last clicked, held until the reader scrolls, presses a key or touches the page. */
  let chosen: number | null = null;
  let queued = false;
  const square = smear(marker);

  /** Where the square sits beside a link: after the end of its first text line, centered on it. */
  const place = (link: HTMLAnchorElement) => {
    const range = document.createRange();
    range.selectNodeContents(link);
    const text = range.getClientRects()[0];
    const box = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    const line = Number.parseFloat(style.lineHeight);
    const padding = Number.parseFloat(style.paddingTop);
    return {
      x: link.offsetLeft + (text ? text.right - box.left : link.offsetWidth) + spacing,
      y: link.offsetTop + padding + (line - marker.offsetHeight) / 2,
    };
  };
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
    const first = current === -1;
    current = index;
    for (const [at, { link }] of parts.entries()) {
      if (at === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    const target = place(part.link);
    marker.style.visibility = "visible";
    if (first || still.matches) square.jump(target);
    else square.move(target);
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener("scroll", schedule, { passive: true });
  const remeasure = () => {
    current = -1;
    schedule();
  };
  addEventListener("resize", remeasure);
  // The web font changes the words' widths once it arrives.
  void document.fonts.ready.then(remeasure);
  update();
}
