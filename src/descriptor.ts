/** How fast a descriptor scrolls on average, in px per second. */
const speed = 30;
/** Still at the start before moving, and at the end before fading, in ms: time to read. */
const rest = 1500;
/** The fade out at the end, and the fade back in at the start, in ms each. */
const fade = 400;
/** The right fade's width (`fade.both`: the table gap): the last word stops clear of it. */
const fadeWidth = 16;
/** Eases into and out of the move, so the text never starts or stops at full speed. */
const easing = "cubic-bezier(0.45, 0, 0.4, 1)";

type State = {
  /** How far the text moves to show its end; null while the text fits its cell. */
  over: number | null;
  visible: boolean;
  animation: Animation | null;
};

/**
 * A project row's descriptor that does not fit its cell (on phones, where descriptions take the
 * row) scrolls to its end, rests, fades and starts over, so the title keeps its room and the
 * descriptor reads in full, left to right, once per cycle. Only a descriptor that overflows and is
 * on screen moves; with motion reduced none do, and the CSS keeps them ellipsized (`row.tsx`).
 *
 * One cycle, in step for every row: all start moving together at the same speed, each stops at
 * its own end, and once the longest has rested at its end they all fade out, return and fade in
 * together. The list resets as one, so the eye follows one rhythm. Cycles count from the
 * document timeline's origin, so a row that comes into view joins in step.
 */
export function loopDescriptors(): void {
  const descriptors = new Map<HTMLElement, State>();
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const measure = (descriptor: HTMLElement, state: State) => {
    const track = descriptor.firstElementChild;
    if (!track) return;
    // The text alone, not the track's box.
    const text = document.createRange();
    text.selectNodeContents(track);
    const width = text.getBoundingClientRect().width;
    const style = getComputedStyle(descriptor);
    const content =
      descriptor.clientWidth -
      Number.parseFloat(style.paddingInlineStart) -
      Number.parseFloat(style.paddingInlineEnd);
    const overflows = style.overflowX === "hidden" && width > content + 0.5;
    state.over = overflows ? width - (content - fadeWidth) : null;
  };
  /** Builds the shared cycle: rest, the longest move, rest, fade out, fade in, rest. */
  const restart = () => {
    const longest = Math.max(
      0,
      ...[...descriptors.values()].map(({ over }) => ((over ?? 0) / speed) * 1000),
    );
    const fadeAt = rest + longest + rest;
    const cycle = fadeAt + fade * 2 + rest;
    for (const [descriptor, state] of descriptors) {
      state.animation?.cancel();
      state.animation = null;
      const track = descriptor.firstElementChild;
      if (state.over === null || !track || !state.visible || still.matches) {
        descriptor.removeAttribute("data-marquee");
        continue;
      }
      descriptor.setAttribute("data-marquee", "");
      const move = (state.over / speed) * 1000;
      const at = (time: number) => time / cycle;
      const end = `translateX(${-state.over}px)`;
      state.animation = track.animate(
        [
          { offset: 0, transform: "translateX(0)", opacity: 1 },
          { offset: at(rest), transform: "translateX(0)", opacity: 1, easing },
          { offset: at(rest + move), transform: end, opacity: 1 },
          { offset: at(fadeAt), transform: end, opacity: 1 },
          { offset: at(fadeAt + fade), transform: end, opacity: 0 },
          { offset: at(fadeAt + fade), transform: "translateX(0)", opacity: 0 },
          { offset: at(fadeAt + fade * 2), transform: "translateX(0)", opacity: 1 },
          { offset: 1, transform: "translateX(0)", opacity: 1 },
        ],
        { duration: cycle, iterations: Number.POSITIVE_INFINITY },
      );
      state.animation.startTime = 0;
    }
  };
  const resized = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const state = target instanceof HTMLElement ? descriptors.get(target) : undefined;
      if (state && target instanceof HTMLElement) measure(target, state);
    }
    restart();
  });
  const seen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const state = target instanceof HTMLElement ? descriptors.get(target) : undefined;
      if (state) state.visible = isIntersecting;
    }
    restart();
  });
  for (const descriptor of document.querySelectorAll<HTMLElement>("[data-descriptor]")) {
    descriptors.set(descriptor, { over: null, visible: false, animation: null });
    resized.observe(descriptor);
    seen.observe(descriptor);
  }
  still.addEventListener("change", restart);
  document.fonts.addEventListener("loadingdone", () => {
    for (const [descriptor, state] of descriptors) measure(descriptor, state);
    restart();
  });
}
