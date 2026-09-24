import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { type Theme, themeClass } from "../theme.ts";
import { colors, denseMarker, media, space } from "../tokens.stylex.ts";
import { type Style, ui } from "../ui.tsx";

/** Touch releases this far outside the button still count, forgiving thumbs on small icons. */
const touchSlop = 11;

function current(): Theme {
  const root = document.documentElement;
  if (root.classList.contains(themeClass.dark.split(" ")[0] ?? "")) return "dark";
  if (root.classList.contains(themeClass.light.split(" ")[0] ?? "")) return "light";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ style }: { style?: Style }) {
  const button = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [suppressHover, setSuppressHover] = useState(false);

  useEffect(() => {
    const element = button.current;
    if (!element) return;
    const preference = matchMedia("(prefers-color-scheme: dark)");
    let rect = element.getBoundingClientRect();
    let usedPointer = false;
    let touchStartedInside = false;
    let skipClick = false;
    let skipTimer = 0;
    const inside = (event: PointerEvent) =>
      event.clientX >= rect.left - touchSlop &&
      event.clientX <= rect.right + touchSlop &&
      event.clientY >= rect.top - touchSlop &&
      event.clientY <= rect.bottom + touchSlop;
    const toggle = () => {
      const next = current() === "dark" ? "light" : "dark";
      document.documentElement.classList.remove(
        ...`${themeClass.dark} ${themeClass.light}`.split(" "),
      );
      document.documentElement.classList.add(...themeClass[next].split(" "));
      try {
        localStorage.setItem("theme", next);
      } catch {
        // Storage can be unavailable (private windows); the choice then lasts for this page only.
      }
      setTheme(next);
      if (usedPointer) {
        setSuppressHover(true);
        element.blur();
      }
      usedPointer = false;
      announce(`Switched to ${next} mode`);
    };
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const capture = { signal: controller.signal, capture: true };
    element.addEventListener(
      "pointerdown",
      (event) => (usedPointer = event.pointerType === "mouse" || event.pointerType === "pen"),
      options,
    );
    element.addEventListener("pointerleave", () => setSuppressHover(false), options);
    element.addEventListener(
      "click",
      () => {
        if (!skipClick) return toggle();
        skipClick = false;
        clearTimeout(skipTimer);
      },
      options,
    );
    preference.addEventListener("change", () => setTheme(current()), options);
    addEventListener(
      "scroll",
      () => requestAnimationFrame(() => (rect = element.getBoundingClientRect())),
      { ...options, passive: true },
    );
    addEventListener("resize", () => (rect = element.getBoundingClientRect()), options);
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "touch") touchStartedInside = inside(event);
      },
      capture,
    );
    document.addEventListener(
      "pointerup",
      (event) => {
        if (event.pointerType !== "touch" || !touchStartedInside) return;
        touchStartedInside = false;
        skipClick = true;
        clearTimeout(skipTimer);
        skipTimer = window.setTimeout(() => (skipClick = false), 500);
        if (inside(event)) toggle();
      },
      capture,
    );
    document.addEventListener("pointercancel", () => (touchStartedInside = false), capture);
    setTheme(current());
    return () => controller.abort();
  }, []);

  const label = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
  return (
    <button
      ref={button}
      {...stylex.props(ui.reset, styles.toggle, !suppressHover && styles.hoverable, style)}
      type="button"
      aria-label={label}
      title={label}
    >
      <svg {...stylex.props(styles.icon, styles.sun)} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 0 0-1.061 1.06l1.06 1.06Z" />
      </svg>
      <svg {...stylex.props(styles.icon, styles.moon)} viewBox="0 0 20 20" aria-hidden="true">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z"
        />
      </svg>
    </button>
  );
}

const styles = stylex.create({
  toggle: {
    // Desktop: fixed to the bottom of the viewport, level with the homepage metadata. When the
    // viewport is too short for that (see `align.ts`), it moves to the top-right corner of its
    // positioning box, level with the name: the layout on the homepage, where it lines up with
    // the table's right edge as on phones, and the sidebar on inner pages.
    position: {
      default: null,
      [media.mobile]: "sticky",
      [media.desktop]: "fixed",
      [stylex.when.ancestor("[data-dense]", denseMarker)]: { [media.desktop]: "absolute" },
    },
    zIndex: { default: null, [media.mobile]: 101 },
    top: {
      default: null,
      [media.mobile]: 0,
      [media.desktop]: "auto",
      // The top padding above the name, less the toggle's overhang around its first line.
      [stylex.when.ancestor("[data-dense]", denseMarker)]: {
        [media.desktop]: `calc(48px + (${space.linkLineHeight} - ${space.toggleSize}) / 2)`,
      },
    },
    right: {
      default: null,
      [stylex.when.ancestor("[data-dense]", denseMarker)]: { [media.desktop]: 0 },
    },
    bottom: {
      default: null,
      [media.desktop]: space.footerInset,
      [stylex.when.ancestor("[data-dense]", denseMarker)]: { [media.desktop]: "auto" },
    },
    gridColumn: { default: null, [media.mobile]: 2 },
    order: { default: null, [media.mobile]: 1 },
    justifySelf: { default: null, [media.mobile]: "end" },
    alignSelf: { default: null, [media.mobile]: "start" },
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: space.toggleSize,
    height: {
      default: space.toggleSize,
      [media.mobile]: `calc(24px + ${space.linkLineHeight} + 8px)`,
    },
    minHeight: { default: null, [media.mobile]: space.toggleSize },
    padding: {
      default: 0,
      [media.mobile]: `calc(24px + ${space.toggleOpticalOffset}) 0 calc(8px - ${space.toggleOpticalOffset})`,
    },
    margin: {
      default: "auto 0 0",
      // Phones: centered over the arrows of the table below, which ends where this column does.
      [media.mobile]: `0 calc((${space.arrowWidth} - ${space.toggleSize}) / 2) 0 16px`,
      [media.desktop]: 0,
    },
    color: colors.tertiary,
    borderRadius: "50%",
    boxShadow: { default: null, ":focus-visible": `0 0 0 1px ${colors.primary}` },
    outline: "none",
    "::before": {
      content: { default: null, [media.mobile]: '""' },
      position: { default: null, [media.mobile]: "absolute" },
      // Stops at the page's side padding on the right, where the toggle now overhangs the column.
      inset: { default: null, [media.mobile]: "6px -4px 6px -6px" },
    },
  },
  hoverable: { color: { default: colors.tertiary, ":hover": { [media.hover]: colors.primary } } },
  icon: { fill: "currentColor" },
  sun: { width: "22px", height: "22px", display: colors.sunDisplay },
  moon: { width: "14px", height: "14px", display: colors.moonDisplay },
});
