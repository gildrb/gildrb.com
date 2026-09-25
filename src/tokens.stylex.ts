import * as stylex from "@stylexjs/stylex";

const light = "@media (prefers-color-scheme: light)";

export const media = stylex.defineConsts({
  mobile: "@media (max-width: 767px)",
  desktop: "@media (min-width: 768px)",
  hover: "@media (hover: hover)",
  motion: "@media screen and (prefers-reduced-motion: no-preference)",
});

export const colors = stylex.defineVars({
  /** Tells the browser which way the page is lit, for scrollbars and other built-in controls. */
  scheme: { default: "dark", [light]: "light" },
  bg: { default: "oklch(0% 0 0)", [light]: "oklch(100% 0 0)" },
  primary: { default: "oklch(100% 0 0)", [light]: "oklch(0% 0 0)" },
  secondary: { default: "oklch(76.68% 0 0)", [light]: "oklch(42.02% 0 0)" },
  /**
   * One more step down the text ladder. Dark: article → secondary is 11.85 points of lightness,
   * and tertiary takes the same step again (APCA Lc 42 on black, up from 30). Light keeps its
   * value (Lc 72 on white).
   */
  tertiary: { default: "oklch(64.83% 0 0)", [light]: "oklch(56.58% 0 0)" },
  article: { default: "oklch(88.53% 0 0)", [light]: "oklch(27.07% 0 0)" },
  hairline: { default: "oklch(100% 0 0 / 0.12)", [light]: "oklch(0% 0 0 / 0.12)" },
  codeBg: { default: "oklch(20.44% 0 0)", [light]: "oklch(93.12% 0 0)" },
  terminalBg: { default: "oklch(14.57% 0 0)", [light]: "oklch(96.96% 0 0)" },
  terminalRowBg: { default: "oklch(16.98% 0 0)", [light]: "oklch(95.42% 0 0)" },
  terminalFrameBg: { default: "oklch(19.3% 0 0)", [light]: "oklch(93.89% 0 0)" },
  /** Muted text on terminal surfaces, kept at 4.5:1 contrast or better. */
  terminalMuted: { default: "oklch(58.63% 0 0)", [light]: "oklch(53.13% 0 0)" },
  proseWeight: { default: "380", [light]: "400" },
  artworkFilter: { default: "none", [light]: "brightness(0)" },
  sunDisplay: { default: "block", [light]: "none" },
  moonDisplay: { default: "none", [light]: "block" },
});

export const dark = stylex.createTheme(colors, {
  scheme: "dark",
  bg: "oklch(0% 0 0)",
  primary: "oklch(100% 0 0)",
  secondary: "oklch(76.68% 0 0)",
  tertiary: "oklch(64.83% 0 0)",
  article: "oklch(88.53% 0 0)",
  hairline: "oklch(100% 0 0 / 0.12)",
  codeBg: "oklch(20.44% 0 0)",
  terminalBg: "oklch(14.57% 0 0)",
  terminalRowBg: "oklch(16.98% 0 0)",
  terminalFrameBg: "oklch(19.3% 0 0)",
  terminalMuted: "oklch(58.63% 0 0)",
  proseWeight: "380",
  artworkFilter: "none",
  sunDisplay: "block",
  moonDisplay: "none",
});

export const lightTheme = stylex.createTheme(colors, {
  scheme: "light",
  bg: "oklch(100% 0 0)",
  primary: "oklch(0% 0 0)",
  secondary: "oklch(42.02% 0 0)",
  tertiary: "oklch(56.58% 0 0)",
  article: "oklch(27.07% 0 0)",
  hairline: "oklch(0% 0 0 / 0.12)",
  codeBg: "oklch(93.12% 0 0)",
  terminalBg: "oklch(96.96% 0 0)",
  terminalRowBg: "oklch(95.42% 0 0)",
  terminalFrameBg: "oklch(93.89% 0 0)",
  terminalMuted: "oklch(53.13% 0 0)",
  proseWeight: "400",
  artworkFilter: "brightness(0)",
  sunDisplay: "none",
  moonDisplay: "block",
});

export const space = stylex.defineVars({
  sectionGap: "24px",
  sectionContentGap: "6px",
  textMediaGap: "32px",
  caseTitleTextGap: "24px",
  linkLineHeight: { default: "24px", "@media (min-width: 768px)": "1.5rem" },
  sidebarBaselinePitch: "2rem",
  /**
   * The smallest thing a finger should have to hit. On phones every table row and the table
   * header is exactly this tall.
   */
  touchTarget: "44px",
  /** Pads a phone line (24px) out to a touch target. */
  touchInset: "calc((44px - 24px) / 2)",
  /**
   * Between two lines of a link list: the sidebar pitch less a line on desktop; on phones the
   * compact list's own gap (the section content gap), which keeps the whole table on screen.
   * Links pad into half of it, so their hit areas meet with no dead space between them.
   */
  linkGap: { default: "calc(2rem - 1.5rem)", "@media (max-width: 767px)": "6px" },
  portfolioRowPadding: "calc((2.5rem - 1.5rem) / 2)",
  toggleSize: "32px",
  /** The box each row's arrow is centered in, so ↗ and → share one axis with the theme toggle. */
  arrowWidth: "16px",
  toggleOpticalOffset: "2px",
  /** The page's inset from the viewport edge on desktop: top of the sidebar and content, bottom of the footer. */
  pageInset: "48px",
  sidebarColumn: "240px",
  contentColumn: "540px",
  layoutGap: "48px",
  mediaRadius: "22px",
  tableGap: "16px",
  mobileTableGap: "clamp(8px, 3vw, 16px)",
  mobileCellEndSpace: "10px",
  tableColumns: "max-content max-content minmax(0, 1fr) minmax(19px, max-content)",
});

/** Put on a table row so its cells can react to the row's hover and focus. */
export const rowMarker = stylex.defineMarker();

/**
 * Put on <html>, which carries page-wide state: `data-dense` and `data-compact` when a desktop
 * viewport is too short for the full layout (see `align.ts`), and `data-entered` once the homepage
 * entrance has played (see `client.ts`).
 */
export const rootMarker = stylex.defineMarker();
