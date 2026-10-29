import { pageColor } from "./tokens.stylex.ts";

/**
 * The page color before anything else is parsed, for the system scheme: the browser never shows
 * its own white canvas between pages, in either theme. Matches `colors.bg`.
 */
export const themeCss = [
  `html{background:${pageColor.dark};color-scheme:dark}`,
  `@media (prefers-color-scheme:light){html{background:${pageColor.light};color-scheme:light}}`,
].join("");

/**
 * On a Cloudflare Pages preview host, swaps the favicon so a shared link reads as a draft, not
 * the site. Runs from `<head>` once the favicon link above it is parsed.
 */
export const previewScript = `if(location.hostname.endsWith(".pages.dev"))document.getElementById("favicon").href="/preview-favicon.svg?v=4"`;
