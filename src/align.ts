/**
 * Aligns layout that CSS alone cannot express, before the first paint and again on resize:
 *
 * - Desktop: sizes the sidebar intro to the homepage summary as it wraps in the content column,
 *   on every page, so the sidebar links line up with the project table and stay put across pages.
 * - Desktop, short viewports: marks the page dense when the sidebar links would run under the
 *   fixed theme toggle, which then docks beside the name (see `theme.tsx`).
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

  // Desktop, short viewports: the sidebar is sticky, so its links can run under the fixed theme
  // toggle. `data-dense` then docks the toggle beside the name (see `theme.tsx`).
  const root = document.documentElement;
  const toggle = document.querySelector<HTMLElement>("aside [data-island=theme] button");
  delete root.dataset.dense;
  if (matchMedia("(min-width: 768px)").matches && sidebarLinks && toggle) {
    const dense =
      sidebarLinks.getBoundingClientRect().bottom + toggle.offsetHeight >
      toggle.getBoundingClientRect().top;
    if (dense) root.dataset.dense = "";
  }
}
