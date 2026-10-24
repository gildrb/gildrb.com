/** How fast the shortest looping descriptor moves, in px per second: slow enough to read. */
const speed = 32;
/** The space between the descriptor and its copy in the loop. */
const gap = 32;
/** The rest between rounds, as the share of a round that `row.tsx`'s keyframes hold still. */
const rest = 0.2;

type State = {
  /** How far one round moves: the text and the gap; null while the text fits its cell. */
  distance: number | null;
  visible: boolean;
};

/**
 * Phones: a project row's descriptor that does not fit its cell loops sideways (`row.tsx`), so the title
 * keeps its room and the descriptor still reads in full. Only a descriptor that overflows and is on screen
 * loops; the rest stand still, and with motion reduced the CSS keeps them ellipsized. Rows that
 * resize or come into view are measured again.
 *
 * Every loop shares one round, the shortest one's at `speed`: longer texts move faster, so all of
 * them rest and start again together. Each round starts at the document timeline's origin, so a
 * row that comes into view joins the others in step.
 */
export function loopDescriptors(): void {
  const descriptors = new Map<HTMLElement, State>();
  const apply = (descriptor: HTMLElement) => {
    const state = descriptors.get(descriptor);
    if (state !== undefined && state.distance !== null && state.visible) {
      descriptor.setAttribute("data-marquee", "");
      // Read after the attribute is set: only then does the loop's animation exist.
      for (const animation of descriptor.firstElementChild?.getAnimations() ?? []) {
        animation.startTime = 0;
      }
    } else descriptor.removeAttribute("data-marquee");
  };
  const measure = (descriptor: HTMLElement) => {
    const track = descriptor.firstElementChild;
    const state = descriptors.get(descriptor);
    if (!track || !state) return;
    // The text alone: a range over the track's contents leaves out its `::after`, the copy.
    const text = document.createRange();
    text.selectNodeContents(track);
    const width = text.getBoundingClientRect().width;
    const overflows =
      getComputedStyle(descriptor).overflowX === "hidden" && width > descriptor.clientWidth + 0.5;
    state.distance = overflows ? width + gap : null;
    if (overflows) {
      track.setAttribute("data-copy", track.textContent ?? "");
      descriptor.style.setProperty("--marquee-gap", `${gap}px`);
      descriptor.style.setProperty("--marquee-distance", `${width + gap}px`);
    }
  };
  /** Sets the shared round on every looping descriptor, then starts or stops each loop. */
  const retime = () => {
    let shortest = Number.POSITIVE_INFINITY;
    for (const { distance } of descriptors.values()) {
      if (distance !== null) shortest = Math.min(shortest, distance);
    }
    if (Number.isFinite(shortest)) {
      const time = `${shortest / speed / (1 - rest)}s`;
      for (const [descriptor, { distance }] of descriptors) {
        if (distance !== null) descriptor.style.setProperty("--marquee-time", time);
      }
    }
    for (const descriptor of descriptors.keys()) apply(descriptor);
  };
  const resized = new ResizeObserver((entries) => {
    for (const { target } of entries) if (target instanceof HTMLElement) measure(target);
    retime();
  });
  const seen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const state = target instanceof HTMLElement ? descriptors.get(target) : undefined;
      if (!state || !(target instanceof HTMLElement)) continue;
      state.visible = isIntersecting;
      apply(target);
    }
  });
  for (const descriptor of document.querySelectorAll<HTMLElement>("[data-descriptor]")) {
    descriptors.set(descriptor, { distance: null, visible: false });
    resized.observe(descriptor);
    seen.observe(descriptor);
  }
  document.fonts.addEventListener("loadingdone", () => {
    for (const descriptor of descriptors.keys()) measure(descriptor);
    retime();
  });
}
