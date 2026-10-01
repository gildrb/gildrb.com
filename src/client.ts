import { type FunctionComponent, h, hydrate } from "preact";
import { align } from "./align.ts";
import type { Islands } from "./island.tsx";
import { Email } from "./islands/email.tsx";
import { Portfolio } from "./islands/portfolio.tsx";
import { ThemeToggle } from "./islands/theme.tsx";
import { compareRows, type SortDirection, type SortKey } from "./site.ts";
import { space } from "./tokens.stylex.ts";
import { autoplayVideos } from "./video.ts";
import { enableZoom } from "./zoom.ts";

enableZoom();
autoplayVideos();

const islands: { [Name in keyof Islands]: () => Promise<Islands[Name]> | Islands[Name] } = {
  theme: () => ThemeToggle,
  email: () => Email,
  portfolio: () => Portfolio,
  // Only the Heph case study and /all show the terminal; keep it out of the homepage bundle.
  heph: () => import("./islands/heph.tsx").then((module) => module.Terminal),
  // Only /archetypon runs the converter; its engine loads once files arrive.
  archetypon: () => import("./islands/archetypon.tsx").then((module) => module.Converter),
};

function isIslandName(value: string | undefined): value is keyof Islands {
  return value !== undefined && Object.hasOwn(islands, value);
}

// The islands are already server-rendered: let the first frame paint, then hydrate each one in
// its own task, and the Heph terminal only once it comes near the viewport.
function hydrateIsland(element: HTMLElement) {
  const name = element.dataset.island;
  if (!isIslandName(name)) throw new Error(`Unknown island: ${name}`);
  void Promise.resolve(islands[name]()).then((component) => mount(component, element));
}

/** `Island` serialized these props from the same component's props on the server. */
function mount<Props extends object>(component: FunctionComponent<Props>, element: HTMLElement) {
  const props: Props = JSON.parse(element.dataset.props ?? "{}");
  hydrate(h(component, props), element);
}

const nearViewport = new IntersectionObserver(
  (entries) => {
    for (const { isIntersecting, target } of entries) {
      const island = target.parentElement;
      if (!isIntersecting || !island) continue;
      nearViewport.unobserve(target);
      hydrateIsland(island);
    }
  },
  { rootMargin: "50%" },
);

requestAnimationFrame(() => {
  for (const element of document.querySelectorAll<HTMLElement>("[data-island]")) {
    // Island wrappers are `display: contents` and have no box to observe; watch their content.
    const content = element.firstElementChild;
    if (element.dataset.island === "heph" && content) nearViewport.observe(content);
    else setTimeout(() => hydrateIsland(element));
  }
});

// The first alignment already ran inline before the first paint; keep it current afterwards.
const updateLayout = () => align(space.sectionContentGap.slice(4, -1));
const resized = new ResizeObserver(() => setTimeout(updateLayout, 0));
for (const target of [
  document.querySelector("main"),
  document.querySelector("aside nav"),
  document.querySelector("[data-island=portfolio]")?.firstElementChild,
]) {
  if (target) resized.observe(target);
}
document.fonts.addEventListener("loadingdone", updateLayout);
addEventListener("load", updateLayout);
addEventListener("resize", updateLayout);

// Restore the scroll position on back/forward navigation, which the sticky layout confuses.
const scrollKey = `gildrb:scroll:${location.pathname}${location.search}`;
history.scrollRestoration = "manual";
function saveScroll() {
  try {
    sessionStorage.setItem(scrollKey, JSON.stringify({ left: scrollX, top: scrollY }));
  } catch {
    // Storage may be unavailable; the browser's default then applies.
  }
}
addEventListener("pagehide", saveScroll);
document.addEventListener(
  "visibilitychange",
  () => document.visibilityState === "hidden" && saveScroll(),
);
addEventListener("pageshow", (event) => {
  const backForward = performance
    .getEntriesByType("navigation")
    .some((entry) => entry instanceof PerformanceNavigationTiming && entry.type === "back_forward");
  if (!event.persisted && !backForward) return;
  let position: { left: number; top: number } | null = null;
  try {
    position = JSON.parse(sessionStorage.getItem(scrollKey) ?? "null");
  } catch {
    return;
  }
  if (!position) return;
  const { left, top } = position;
  const restore = () => scrollTo(left, top);
  restore();
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
});

for (const link of document.querySelectorAll('a[href="#top"]')) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    scrollTo(0, 0);
    history.replaceState(null, "", location.href.replace(/#.*$/, ""));
  });
}

// Homepage: arrow keys step through the links, the theme toggle and the table.
if (location.pathname === "/") {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const items = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-mobile-links] a[href], [data-mobile-links] button, aside button",
      ),
      ...document.querySelectorAll<HTMLElement>(
        "main a[href], main button:not([disabled]), main input:not([disabled])",
      ),
    ].filter(
      (item, index, all) =>
        all.indexOf(item) === index &&
        item.tabIndex >= 0 &&
        !item.closest("[aria-hidden='true']") &&
        item.getClientRects().length > 0 &&
        getComputedStyle(item).visibility !== "hidden",
    );
    const current = items.findIndex((item) => item === document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[current === -1 ? 0 : (current + step + items.length) % items.length]?.focus();
  });
}

// /all?sort=…&direction=… mirrors the order chosen in the homepage table.
const allCases = document.querySelector<HTMLElement>("[data-all-cases]");
const params = new URLSearchParams(location.search);
const sortKey = params.get("sort");
const sortDirection = params.get("direction");
if (allCases && isSortKey(sortKey) && isSortDirection(sortDirection)) {
  const compare = compareRows(sortKey, sortDirection);
  const articles = [...allCases.querySelectorAll<HTMLElement>(":scope > article")];
  allCases.append(...articles.toSorted((left, right) => compare(sortRow(left), sortRow(right))));
}

function sortRow(element: HTMLElement) {
  return {
    date: element.dataset.date ?? "",
    title: element.dataset.title ?? "",
    scope: element.dataset.scope ?? "",
  };
}

function isSortKey(value: string | null): value is SortKey {
  return value === "date" || value === "title" || value === "scope";
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === "ascending" || value === "descending";
}
