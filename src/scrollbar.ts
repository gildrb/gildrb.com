/**
 * The browser's own page scrollbar is hidden site-wide from the first frame (`globalCss` in
 * `layout.tsx`), and this draws the site's in its place, as superlogical.com does. The thumb
 * appears when the page scrolls, when the pointer rests on the track, while the track is focused
 * or dragged, and fades out 0.7s after the reader stops; resting on it or dragging it also
 * widens it a little (see the `[data-pagebar]` rules in `globalCss`). Pressing the track jumps
 * the thumb under the pointer, and the keys a native scrollbar answers work on it.
 *
 * Self-contained on purpose: `scrollbarScript` in `layout.tsx` inlines its source at the end of
 * `<body>`, so the scrollbar is live from the first frame, long before the island script's
 * module graph loads.
 */
export function pageScrollbar(): void {
  /** How long the thumb stays after the page last moved, in milliseconds. */
  const idle = 700;
  type Shown = { track: HTMLElement; thumb: HTMLElement; timer: number | undefined };

  const track = document.createElement("div");
  track.role = "scrollbar";
  track.ariaLabel = "Page scroll";
  track.ariaOrientation = "vertical";
  track.ariaValueMin = "0";
  track.ariaValueMax = "100";
  track.dataset.pagebar = "";
  track.tabIndex = 0;
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  track.append(thumb);
  document.body.append(track);
  const bar: Shown = { track, thumb, timer: undefined };

  /** Where the thumb sits and how tall it is, from the page's own share of it. */
  const measure = (): { travel: number; height: number; max: number } | null => {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if (max <= 0) return null;
    // More to grab with a finger than with a pointer.
    const least = matchMedia("(pointer: coarse)").matches ? 48 : 32;
    const height = Math.min(
      track.clientHeight,
      Math.max(least, (track.clientHeight * innerHeight) / document.documentElement.scrollHeight),
    );
    return { travel: track.clientHeight - height, height, max };
  };

  /** Places the thumb where the page is, and marks the track only when something scrolls. */
  const place = (): void => {
    const measured = measure();
    track.toggleAttribute("data-scrollable", measured !== null);
    if (!measured) return;
    const { travel, height, max } = measured;
    // The height is also the size the thumb grows from when hovered (`globalCss`).
    track.style.setProperty("--pagebar-thumb", `${height}px`);
    thumb.style.transform = `translateY(${travel * Math.min(1, Math.max(0, scrollY / max))}px)`;
    track.ariaValueNow = String(Math.round((scrollY / max) * 100));
  };

  /** Shows the thumb, and keeps it shown until the page has been still for `idle`. */
  const show = (): void => {
    place();
    if (!track.hasAttribute("data-scrollable")) return;
    track.setAttribute("data-shown", "");
    clearTimeout(bar.timer);
    bar.timer = window.setTimeout(() => {
      track.removeAttribute("data-shown");
      bar.timer = undefined;
    }, idle);
  };

  /** Scrolls at once, past the smooth in-page scrolling `layout.tsx` gives links. */
  const scrollTo = (top: number): void => {
    const measured = measure();
    if (!measured) return;
    window.scrollTo({ top: Math.max(0, Math.min(measured.max, top)), behavior: "instant" });
  };

  // Dragging: press anywhere on the track to jump the thumb there, then move the page with it.
  let along = 0;
  let from = 0;
  const move = (event: PointerEvent): void => {
    const measured = measure();
    if (measured && measured.travel > 0) {
      along += ((event.clientY - from) / measured.travel) * measured.max;
      scrollTo(along);
    }
    from = event.clientY;
    show();
  };
  const release = (event: PointerEvent): void => {
    track.removeAttribute("data-dragging");
    track.removeEventListener("pointermove", move);
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    show();
  };
  track.addEventListener("pointerdown", (press) => {
    if (press.button !== 0) return;
    press.preventDefault();
    const measured = measure();
    if (measured && measured.travel > 0) {
      const bounds = track.getBoundingClientRect();
      along = ((press.clientY - bounds.top - measured.height / 2) / measured.travel) * measured.max;
      scrollTo(along);
    }
    from = press.clientY;
    track.setPointerCapture(press.pointerId);
    track.setAttribute("data-dragging", "");
    track.addEventListener("pointermove", move);
    show();
  });
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  // The keys a native scrollbar answers, on the page it scrolls.
  track.addEventListener("keydown", (event) => {
    const step = { ArrowUp: -40, ArrowDown: 40 }[event.key];
    const page = { PageUp: -0.9, PageDown: 0.9 }[event.key];
    const end = { Home: true, End: true }[event.key];
    if (step === undefined && page === undefined && end === undefined) return;
    event.preventDefault();
    if (step !== undefined) scrollTo(scrollY + step);
    else if (page !== undefined) scrollTo(scrollY + page * innerHeight);
    else scrollTo(event.key === "Home" ? 0 : scrollY + innerHeight);
    show();
  });

  place();
  addEventListener("scroll", show, { passive: true });
  const resized = new ResizeObserver(place);
  resized.observe(document.documentElement);
  resized.observe(document.body);
  addEventListener("resize", place);
}
