import * as stylex from "@stylexjs/stylex";

const light = "@media (prefers-color-scheme: light)";

/**
 * The layout's one unit, in px: every desktop width and gap is a whole multiple of it, and a
 * line (24px) is three. The title column takes 14 units, enough for a person's full name
 * ("Mihai Lupascu" is 109px); the descriptor column is the remainder, 28 units at full width.
 */
const unit = 8;
const dateColumn = `${12 * unit}px`;
const titleColumn = `${14 * unit}px`;
const arrowColumn = `${8 * unit}px`;

export const media = stylex.defineConsts({
  mobile: "@media (max-width: 767px)",
  desktop: "@media (min-width: 768px)",
  /** Room for a third column: the archive beside the homepage, wider archive grid. */
  wide: "@media (min-width: 1280px)",
  hover: "@media (hover: hover)",
  motion: "@media screen and (prefers-reduced-motion: no-preference)",
});

/**
 * How dates are spaced, in Inter's font units (see `ui.figures`). The page sets them as CSS; the
 * share image (`og.tsx`) draws its dates from the same numbers.
 */
export const figureUnits = stylex.defineConsts({
  unitsPerEm: "2048",
  /** Every tabular digit's advance. */
  tabular: "1328",
  /** Digit to digit. */
  digit: "-95.1",
  /** Digit to hyphen, after the digit's own tracking. */
  beforeHyphen: "17",
  /** Hyphen to digit. */
  afterHyphen: "-88.2",
});

/**
 * Inter's OpenType features. Interface text takes case forms (`case`): arrows, hyphens and @
 * centred on capitals and figures, which is what they stand beside in names, dates, headers and
 * links. Running prose and the email address keep the default forms, which sit among lowercase
 * letters. The grotesque G (Inter's cv10) is not listed: it is built into the font file itself.
 */
export const fontFeatures = stylex.defineConsts({
  interface: '"liga" 1, "calt" 1, "case" 1',
  prose: '"liga" 1, "calt" 1',
});

/**
 * Underlined links: thinner than Inter's own underline (140/2048 em, about 1.1px at 16px), set
 * at Inter's underline position (348/2048 em below the baseline) so it keeps its gap below the
 * letters; a thin line at the `auto` offset touches them.
 */
export const underline = stylex.defineConsts({
  thickness: "0.5px",
  offset: "0.17em",
});

export const colors = stylex.defineVars({
  /**
   * Tells the browser which way the page is lit, for scrollbars, overscroll and other built-in
   * controls: either, following the system, unless the toggle forces one (`dark`, `lightTheme`).
   */
  scheme: "light dark",
  bg: { default: "oklch(0% 0 0)", [light]: "oklch(100% 0 0)" },
  primary: { default: "oklch(100% 0 0)", [light]: "oklch(0% 0 0)" },
  secondary: { default: "oklch(76.68% 0 0)", [light]: "oklch(42.02% 0 0)" },
  /**
   * One more step down the text ladder. Dark: article → secondary is 11.85 points of lightness,
   * and tertiary takes the same step again (APCA Lc 42 on black, up from 30). Light is not a
   * mirror: gray on white reads fainter than on black, the reason light prose is heavier
   * (`proseWeight`). Light tertiary is the darkest gray WCAG allows text to be lighter than:
   * 4.54:1 on white (APCA Lc 72).
   */
  tertiary: { default: "oklch(64.83% 0 0)", [light]: "oklch(56.58% 0 0)" },
  article: { default: "oklch(88.53% 0 0)", [light]: "oklch(27.07% 0 0)" },
  hairline: { default: "oklch(100% 0 0 / 0.12)", [light]: "oklch(0% 0 0 / 0.12)" },
  codeBg: { default: "oklch(20.44% 0 0)", [light]: "oklch(93.12% 0 0)" },
  /** Edge of code: commands, code blocks and inline code; stronger than `hairline` to read as a box. */
  codeBorder: { default: "oklch(100% 0 0 / 0.24)", [light]: "oklch(0% 0 0 / 0.16)" },
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
  codeBorder: "oklch(100% 0 0 / 0.24)",
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
  codeBorder: "oklch(0% 0 0 / 0.16)",
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
  /** The box each row's → is centered in, so it shares one axis with the theme toggle. */
  arrowWidth: "16px",
  toggleOpticalOffset: "2px",
  /** The page's inset from the viewport edge on desktop: top of the sidebar and content, bottom of the footer. */
  pageInset: "48px",
  sidebarColumn: `${30 * unit}px`,
  contentColumn: `${68 * unit}px`,
  layoutGap: `${6 * unit}px`,
  /**
   * Case pages on wide screens: the images' width. They share the text's left edge and end where
   * the homepage's archive grid starts: the text column plus the gap after it.
   */
  figureColumn: `${(68 + 6) * unit}px`,
  mediaRadius: "22px",
  /** Archive tiles: one square cell, at least this wide; the grid fills the rest. */
  tileMin: `${26 * unit}px`,
  tileGap: `${4 * unit}px`,
  tableGap: `${2 * unit}px`,
  mobileTableGap: "clamp(8px, 3vw, 16px)",
  mobileCellEndSpace: "10px",
  dateColumn,
  titleColumn,
  arrowColumn,
  /** Desktop: unit multiples. Phones: content-sized, the descriptor column taking what is left. */
  tableColumns: {
    default: `${dateColumn} ${titleColumn} minmax(max-content, 1fr) ${arrowColumn}`,
    "@media (max-width: 767px)": "max-content max-content minmax(0, 1fr) minmax(19px, max-content)",
  },
  /**
   * The project tables (homepage, "View next"): project, subject, then the date set right, and a
   * slot past it for the row square or →. Desktop: the title column a unit multiple, the date as
   * wide as its figures. Phones: content-sized, the subject taking what is left.
   */
  projectColumns: {
    default: `${titleColumn} minmax(max-content, 1fr) max-content 16px`,
    "@media (max-width: 767px)": "max-content minmax(0, 1fr) max-content minmax(19px, max-content)",
  },
});

/** Put on a table row so its cells can react to the row's hover and focus. */
export const rowMarker = stylex.defineMarker();

/**
 * Put on <html>, which carries page-wide state: `data-dense` and `data-compact` when a desktop
 * viewport is too short for the full layout (see `align.ts`).
 */
export const rootMarker = stylex.defineMarker();

/** Put on an archive tile link so its label can react to the tile's hover and focus. */
export const tileMarker = stylex.defineMarker();

/** Put on a table row's descriptor cell so its text can loop when it does not fit (`descriptor.ts`). */
export const descriptorMarker = stylex.defineMarker();
