/** How fast a looping descriptor moves, in px per second: slow enough to read. */
const speed = 32;
/** The space between the descriptor and its copy in the loop. */
const gap = 32;
/** The rest between rounds, as the share of a round that `row.tsx`'s keyframes hold still. */
const rest = 0.2;

/**
 * Phones: a project row's descriptor that does not fit its cell loops sideways (`row.tsx`), so the title
 * keeps its room and the descriptor still reads in full. Only a descriptor that overflows and is on screen
 * loops; the rest stand still, and with motion reduced the CSS keeps them ellipsized. Rows that
 * resize or come into view are measured again.
 */
export function loopDescriptors(): void {
  const descriptors = new Map<HTMLElement, { overflows: boolean; visible: boolean }>();
  const apply = (descriptor: HTMLElement) => {
    const state = descriptors.get(descriptor);
    if (state?.overflows === true && state.visible) descriptor.setAttribute("data-marquee", "");
    else descriptor.removeAttribute("data-marquee");
  };
  const measure = (descriptor: HTMLElement) => {
    const text = descriptor.querySelector<HTMLElement>("[data-descriptor-text]");
    const state = descriptors.get(descriptor);
    if (!text || !state) return;
    const width = text.getBoundingClientRect().width;
    state.overflows =
      getComputedStyle(descriptor).overflowX === "hidden" && width > descriptor.clientWidth + 0.5;
    if (state.overflows) {
      const distance = width + gap;
      descriptor.style.setProperty("--marquee-gap", `${gap}px`);
      descriptor.style.setProperty("--marquee-distance", `${distance}px`);
      descriptor.style.setProperty("--marquee-time", `${distance / speed / (1 - rest)}s`);
    }
    apply(descriptor);
  };
  const resized = new ResizeObserver((entries) => {
    for (const { target } of entries) if (target instanceof HTMLElement) measure(target);
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
    descriptors.set(descriptor, { overflows: false, visible: false });
    resized.observe(descriptor);
    seen.observe(descriptor);
  }
  document.fonts.addEventListener("loadingdone", () => {
    for (const descriptor of descriptors.keys()) measure(descriptor);
  });
}
