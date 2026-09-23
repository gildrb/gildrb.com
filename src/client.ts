import { type FunctionComponent, h, hydrate } from "preact";
import type { Islands } from "./island.tsx";
import { Email } from "./islands/email.tsx";
import { Portfolio } from "./islands/portfolio.tsx";
import { ThemeToggle } from "./islands/theme.tsx";
import { cases, compareRows, type SortDirection, type SortKey } from "./site.ts";
import { space } from "./tokens.stylex.ts";

const islands: { [Name in keyof Islands]: () => Promise<Islands[Name]> | Islands[Name] } = {
  theme: () => ThemeToggle,
  email: () => Email,
  portfolio: () => Portfolio,
  // Only the Heph case study and /all show the terminal; keep it out of the homepage bundle.
  heph: () => import("./islands/heph.tsx").then((module) => module.Terminal),
};

// The islands are already server-rendered: let the first frame paint, then hydrate each one in
// its own task, and the Heph terminal only once it comes near the viewport.
function hydrateIsland(element: HTMLElement) {
  const name = element.dataset.island as keyof Islands;
  const props: object = JSON.parse(element.dataset.props ?? "{}");
  void Promise.resolve(islands[name]()).then((component) =>
    hydrate(h(component as FunctionComponent, props), element),
  );
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

const phone = matchMedia("(max-width: 767px)");
const desktop = matchMedia("(min-width: 768px)");
const content = document.querySelector("main");
const sidebarLinks = document.querySelector("aside nav");
const mobileLinks = document.querySelector<HTMLElement>("[data-mobile-links]");
const measure = document.createElement("canvas").getContext("2d");

/**
 * Sizes the desktop intro to the homepage summary as it wraps in the content column, on every
 * page, so the sidebar links line up with the project table and stay put across navigation.
 */
function updateIntroHeight() {
  if (!desktop.matches || !content || !sidebarLinks || !measure) {
    document.body.style.removeProperty("--desktop-intro-height");
    return;
  }
  const style = getComputedStyle(sidebarLinks);
  measure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const width = content.getBoundingClientRect().width;
  let line = "";
  let lines = 1;
  for (const word of (document.body.dataset.intro ?? "").split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure.measureText(next).width > width) {
      lines += 1;
      line = word;
    } else {
      line = next;
    }
  }
  const gap = Number.parseFloat(style.getPropertyValue(space.sectionContentGap.slice(4, -1)));
  document.body.style.setProperty(
    "--desktop-intro-height",
    `${(lines + 1) * Number.parseFloat(style.lineHeight) + gap}px`,
  );
}

/** On phones, starts the contact column where the table's scope column starts. */
function updateContactColumn() {
  if (!mobileLinks) return;
  if (!phone.matches) {
    mobileLinks.style.removeProperty("--mobile-contact-start");
    return;
  }
  const origin = mobileLinks.getBoundingClientRect().left;
  const scope = document.querySelector("[data-scope-column]");
  const start = scope
    ? scope.getBoundingClientRect().left -
      origin -
      Number.parseFloat(getComputedStyle(mobileLinks).columnGap)
    : (mobileLinks.querySelector("[data-guardrail]")?.getBoundingClientRect().right ?? origin) -
      origin;
  mobileLinks.style.setProperty("--mobile-contact-start", `${Math.max(0, start)}px`);
}

function updateLayout() {
  updateIntroHeight();
  updateContactColumn();
}

const resized = new ResizeObserver(() => setTimeout(updateLayout, 0));
for (const target of [
  content,
  sidebarLinks,
  mobileLinks,
  document.querySelector("[data-island=portfolio]")?.firstElementChild,
]) {
  if (target) resized.observe(target);
}
document.fonts.addEventListener("loadingdone", updateIntroHeight);
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
  const row = (element: HTMLElement) => ({
    date: element.dataset.date ?? "",
    title: element.dataset.title ?? "",
    scope: element.dataset.scope ?? "",
  });
  const articles = [...allCases.querySelectorAll<HTMLElement>(":scope > article")];
  allCases.append(...articles.sort((left, right) => compare(row(left), row(right))));
}

function isSortKey(value: string | null): value is SortKey {
  return value === "date" || value === "title" || value === "scope";
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === "ascending" || value === "descending";
}

// WebMCP: let in-browser agents list and open the case studies.
type ModelContext = {
  registerTool?: (tool: object, options: { signal: AbortSignal }) => Promise<unknown>;
  provideContext?: (context: { tools: object[] }) => void;
};
// Current browsers expose navigator.modelContext; early builds used document.modelContext.
const context =
  (navigator as Navigator & { modelContext?: ModelContext }).modelContext ??
  (document as Document & { modelContext?: ModelContext }).modelContext;
const slugs = cases.map(({ slug }) => slug);
const tools = [
  {
    name: "list_portfolio_pages",
    title: "List portfolio pages",
    description: "List Gil Rodrigues's public portfolio pages and Markdown sources.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => ({
      pages: slugs.map((slug) => ({
        slug,
        url: new URL(`/${slug}`, location.origin).href,
        markdown: new URL(`/content/${slug}.md`, location.origin).href,
      })),
    }),
  },
  {
    name: "open_portfolio_page",
    title: "Open a portfolio page",
    description: "Open a selected public portfolio case study in the current tab.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", enum: slugs, description: "The portfolio page to open." },
      },
      required: ["slug"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ slug }: { slug: string }) => {
      if (!slugs.includes(slug)) throw new TypeError(`Unknown portfolio slug: ${slug}`);
      const url = new URL(`/${slug}`, location.origin);
      location.assign(url);
      return { opened: url.href };
    },
  },
];
const register = context?.registerTool;
if (register) {
  const controller = new AbortController();
  addEventListener("pagehide", () => controller.abort(), { once: true });
  // WebMCP is experimental; the page works the same when registration fails.
  void Promise.all(tools.map((tool) => register(tool, { signal: controller.signal }))).catch(
    () => {},
  );
} else {
  context?.provideContext?.({ tools });
}
