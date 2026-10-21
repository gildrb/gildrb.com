/** How fast a looping scope moves, in px per second: slow enough to read. */
const speed = 32;
/** The space between the scope and its copy in the loop. */
const gap = 32;
/** The rest between rounds, as the share of a round that `row.tsx`'s keyframes hold still. */
const rest = 0.2;

/**
 * Phones: a project row's scope that does not fit its cell loops sideways (`row.tsx`), so the title
 * keeps its room and the scope still reads in full. Only a scope that overflows and is on screen
 * loops; the rest stand still, and with motion reduced the CSS keeps them ellipsized. Rows that
 * resize or come into view are measured again.
 */
export function loopScopes(): void {
  const scopes = new Map<HTMLElement, { overflows: boolean; visible: boolean }>();
  const apply = (scope: HTMLElement) => {
    const state = scopes.get(scope);
    if (state?.overflows === true && state.visible) scope.setAttribute("data-marquee", "");
    else scope.removeAttribute("data-marquee");
  };
  const measure = (scope: HTMLElement) => {
    const text = scope.querySelector<HTMLElement>("[data-scope-text]");
    const state = scopes.get(scope);
    if (!text || !state) return;
    const width = text.getBoundingClientRect().width;
    state.overflows =
      getComputedStyle(scope).overflowX === "hidden" && width > scope.clientWidth + 0.5;
    if (state.overflows) {
      const distance = width + gap;
      scope.style.setProperty("--marquee-gap", `${gap}px`);
      scope.style.setProperty("--marquee-distance", `${distance}px`);
      scope.style.setProperty("--marquee-time", `${distance / speed / (1 - rest)}s`);
    }
    apply(scope);
  };
  const resized = new ResizeObserver((entries) => {
    for (const { target } of entries) if (target instanceof HTMLElement) measure(target);
  });
  const seen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const state = target instanceof HTMLElement ? scopes.get(target) : undefined;
      if (!state || !(target instanceof HTMLElement)) continue;
      state.visible = isIntersecting;
      apply(target);
    }
  });
  for (const scope of document.querySelectorAll<HTMLElement>("[data-scope]")) {
    scopes.set(scope, { overflows: false, visible: false });
    resized.observe(scope);
    seen.observe(scope);
  }
  document.fonts.addEventListener("loadingdone", () => {
    for (const scope of scopes.keys()) measure(scope);
  });
}
