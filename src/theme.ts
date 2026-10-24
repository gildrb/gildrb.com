import * as stylex from "@stylexjs/stylex";
import { dark, lightTheme, pageColor } from "./tokens.stylex.ts";

export type Theme = "dark" | "light";

/** Class names that force a theme on `<html>`; without one, the system preference applies. */
export const themeClass: Record<Theme, string> = {
  dark: stylex.props(dark).className ?? "",
  light: stylex.props(lightTheme).className ?? "",
};

/**
 * The browser chrome's color: each theme's page background, the very strings `colors.bg` is set
 * from (`pageColor`). `theme-color` takes oklch as CSS does.
 */
export const themeColor: Record<Theme, string> = pageColor;

/**
 * Shows `theme` and points the `theme-color` tag at it. Transitions are off for the switch, so
 * nothing that animates on hover or drag animates its color change (interfaces.rauno.me).
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const still = document.createElement("style");
  still.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(still);
  root.classList.remove(...`${themeClass.dark} ${themeClass.light}`.split(" "));
  root.classList.add(...themeClass[theme].split(" "));
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = themeColor[theme];
  // Apply the new colors while transitions are off, then allow them again.
  void getComputedStyle(root).color;
  requestAnimationFrame(() => still.remove());
}

/**
 * The page color before anything else is parsed, for the system scheme and for a forced theme
 * (`themeScript` adds the class): the browser never shows its own white canvas between pages,
 * in either theme. Matches `colors.bg`.
 */
export const themeCss = [
  `html{background:${themeColor.dark};color-scheme:dark}`,
  `@media (prefers-color-scheme:light){html{background:${themeColor.light};color-scheme:light}}`,
  ...(["dark", "light"] as const).map(
    (theme) =>
      `html.${themeClass[theme].split(" ")[0]}{background:${themeColor[theme]};color-scheme:${theme}}`,
  ),
].join("");

/**
 * Runs in `<head>` before any CSS, so a saved theme never flashes, in the page or the chrome.
 * It points `theme-color` at the shown theme on load, and again whenever the system scheme
 * changes while no theme is forced; the toggle retargets it itself (`applyTheme`).
 */
export const themeScript = `{const c=${JSON.stringify(themeClass)},h=${JSON.stringify(themeColor)},r=document.documentElement,q=matchMedia("(prefers-color-scheme: dark)");try{const t=localStorage.getItem("theme");if(t==="dark"||t==="light")r.classList.add(...c[t].split(" "))}catch{}const s=()=>{const m=document.querySelector('meta[name="theme-color"]');if(!m)return;const f=["dark","light"].find(t=>r.classList.contains(c[t].split(" ")[0]));m.content=h[f??(q.matches?"dark":"light")]};s();q.addEventListener("change",s)}if(location.hostname.endsWith(".pages.dev"))document.getElementById("favicon").href="/preview-favicon.svg?v=4"`;
