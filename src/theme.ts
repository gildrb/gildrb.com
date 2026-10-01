import * as stylex from "@stylexjs/stylex";
import { dark, lightTheme } from "./tokens.stylex.ts";

export type Theme = "dark" | "light";

/** Class names that force a theme on `<html>`; without one, the system preference applies. */
export const themeClass: Record<Theme, string> = {
  dark: stylex.props(dark).className ?? "",
  light: stylex.props(lightTheme).className ?? "",
};

/** The browser chrome's color: each theme's page background, `colors.bg`. */
export const themeColor: Record<Theme, string> = { dark: "#000000", light: "#ffffff" };

/** Points the `theme-color` tag at the chosen theme. */
export function setThemeColor(theme: Theme) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = themeColor[theme];
}

/**
 * Runs in `<head>` before any CSS, so a saved theme never flashes, in the page or the chrome.
 * It points `theme-color` at the shown theme on load, and again whenever the system scheme
 * changes while no theme is forced; the toggle retargets it itself (`setThemeColor`).
 */
export const themeScript = `{const c=${JSON.stringify(themeClass)},h=${JSON.stringify(themeColor)},r=document.documentElement,q=matchMedia("(prefers-color-scheme: dark)");try{const t=localStorage.getItem("theme");if(t==="dark"||t==="light")r.classList.add(...c[t].split(" "))}catch{}const s=()=>{const m=document.querySelector('meta[name="theme-color"]');if(!m)return;const f=["dark","light"].find(t=>r.classList.contains(c[t].split(" ")[0]));m.content=h[f??(q.matches?"dark":"light")]};s();q.addEventListener("change",s)}if(location.hostname.endsWith(".pages.dev"))document.getElementById("favicon").href="/preview-favicon.svg"`;
