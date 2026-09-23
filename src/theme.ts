import * as stylex from "@stylexjs/stylex";
import { dark, lightTheme } from "./tokens.stylex.ts";

export type Theme = "dark" | "light";

/** Class names that force a theme on `<html>`; without one, the system preference applies. */
export const themeClass: Record<Theme, string> = {
  dark: stylex.props(dark).className ?? "",
  light: stylex.props(lightTheme).className ?? "",
};

/** Runs in `<head>` before any CSS, so a saved theme never flashes. */
export const themeScript = `try{const t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.classList.add(...${JSON.stringify(themeClass)}[t].split(" "))}catch{}if(location.hostname.endsWith(".pages.dev"))document.getElementById("favicon").href="/preview-favicon.svg"`;
