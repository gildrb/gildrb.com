/**
 * Aligns layout that CSS alone cannot express, before the first paint and again on resize:
 *
 * - Desktop: sizes the sidebar intro to the homepage summary as it wraps in the content column,
 *   on every page, so the sidebar links line up with the project table and stay put across pages.
 * - Phones: starts the contact column where the table's scope column starts, and shows the
 *   project list's bottom fade in the first frame when it overflows (the scroll-driven animation
 *   takes over from the next frame).
 *
 * Self-contained on purpose: `alignScript` inlines its source at the end of `<body>`.
 */
export function align(gapProperty: string): void {
  const body = document.body;
  const content = document.querySelector("main");
  const sidebarLinks = document.querySelector("aside nav");
  const measure = document.createElement("canvas").getContext("2d");
  if (matchMedia("(min-width: 768px)").matches && content && sidebarLinks && measure) {
    const style = getComputedStyle(sidebarLinks);
    measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const width = content.getBoundingClientRect().width;
    let line = "";
    let lines = 1;
    for (const word of (body.dataset.intro ?? "").split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure.measureText(next).width > width) {
        lines += 1;
        line = word;
      } else {
        line = next;
      }
    }
    const gap = Number.parseFloat(style.getPropertyValue(gapProperty));
    body.style.setProperty(
      "--desktop-intro-height",
      `${(lines + 1) * Number.parseFloat(style.lineHeight) + gap}px`,
    );
  } else {
    body.style.removeProperty("--desktop-intro-height");
  }

  const list = document.querySelector<HTMLElement>("[data-scroll-list]");
  list?.parentElement?.style.setProperty(
    "--list-overflows",
    list.scrollHeight - list.clientHeight - list.scrollTop > 1 ? "1" : "0",
  );

  const links = document.querySelector<HTMLElement>("[data-mobile-links]");
  if (!links) return;
  if (!matchMedia("(max-width: 767px)").matches) {
    links.style.removeProperty("--mobile-contact-start");
    return;
  }
  const origin = links.getBoundingClientRect().left;
  const scope = document.querySelector("[data-scope-column]");
  const start = scope
    ? scope.getBoundingClientRect().left -
      origin -
      Number.parseFloat(getComputedStyle(links).columnGap)
    : (links.querySelector("[data-guardrail]")?.getBoundingClientRect().right ?? origin) - origin;
  links.style.setProperty("--mobile-contact-start", `${Math.max(0, start)}px`);
}
