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

/** Points both `theme-color` tags (one per system scheme) at the chosen theme. */
export function setThemeColor(theme: Theme) {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = themeColor[theme];
  }
}

/** Runs in `<head>` before any CSS, so a saved theme never flashes, in the page or the chrome. */
export const themeScript = `try{const t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.classList.add(...${JSON.stringify(themeClass)}[t].split(" "));for(const m of document.querySelectorAll('meta[name="theme-color"]'))m.content=${JSON.stringify(themeColor)}[t]}}catch{}if(location.hostname.endsWith(".pages.dev"))document.getElementById("favicon").href="/preview-favicon.svg"`;
