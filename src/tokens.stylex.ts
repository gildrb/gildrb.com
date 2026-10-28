import * as stylex from "@stylexjs/stylex";

const light = "@media (prefers-color-scheme: light)";

/**
 * The layout's one unit, in px: every desktop width and gap is a whole multiple of it, and a
 * line (24px) is three. The title column takes 14 units, enough for a person's full name at the
 * emphasis weight ("Mihai Lupascu" is 108px); the descriptor column is the remainder, 28 units
 * at full width.
 */
const unit = 8;
/** The share image's date column (`og.tsx`), which cannot size to its figures as the page does. */
const dateColumn = `${12 * unit}px`;
const titleColumn = `${14 * unit}px`;
const tableGap = `${2 * unit}px`;

/**
 * Text cut by its box's right edge fades out over the last table gap instead: a looping
 * descriptor (`row.tsx`), a command wider than its block (`command.tsx`). A `mask-image`.
 */
export const fade = stylex.defineConsts({
  end: `linear-gradient(to right, black calc(100% - ${tableGap}), transparent)`,
});

export const media = stylex.defineConsts({
  mobile: "@media (max-width: 767px)",
  desktop: "@media (min-width: 768px)",
  /**
   * Room for the banner to break out (`space.bannerColumn`): the centred block (832px) plus one
   * layout gap on each side (928px) plus the 16px a classic scrollbar once took. Narrower, the
   * banner keeps the text's width rather than running past the viewport.
   */
  banner: "@media (min-width: 944px)",
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

/**
 * How a state change shows. A hover, focus or current part changes a color or opacity.
 * - Entering is immediate (`ui.respond`): the row under the pointer is lit the moment it is
 *   reached, so nothing ever waits on an animation.
 * - Leaving fades over `response`, 200ms, on a decelerating curve (`ease-out`): the release
 *   starts quickly, then lingers and dissolves. A pointer sweeping a list leaves a short trail
 *   behind it, which shows the path the hand took. At 150ms on `ease` half the change was done in
 *   50ms and the fade read as an instant swap; past 400ms a sweep leaves four or five rows lit
 *   and the index turns to noise. 300ms was tried; 200ms is the owner's pick.
 * - Every element whose color changes takes part. One that changes on its row's or its parent's
 *   state inherits the color (`color: inherit`) rather than setting its own, or it switches at
 *   once while its row fades. Elements that set their own state color carry `ui.respond`.
 * Nothing travels toward the pointer and no marker follows the reader: state is color. The only
 * thing that moves is an image enlarging, for the reader's own click, over `entry.ts`'s
 * `zoomDuration` (200ms) on its spring.
 */
export const motion = stylex.defineConsts({
  response: "200ms",
  responseEasing: "ease-out",
});

/**
 * The type scale: three sizes, two weights, and tracking that follows the size.
 *
 * Why three sizes and two weights, not one of each: one size at one weight leaves color as the
 * only way to rank text, and a page ranked by gray alone reads as a data listing. The scale adds
 * two more axes: size tells a label from a line of text from the name, and weight tells the
 * thing (a project's name, a page's heading) from what is said about it.
 *
 * Every size sits on the 24px line (three units), so nothing moves between pages: the name is
 * the same size in the same place on the homepage and on every page under it, where the page's
 * title takes the line below it as its child. The heading size, 22px, is the size whose cap
 * height (Inter's is 0.727em) is 16px: two units on a three-unit line. The label's line is 20px
 * in the same 24px box. Phones use the same pixels; from tablets up text scales with `rem`.
 *
 * Tracking is Inter's own dynamic metrics (rsms.me/inter/dynmetrics): `a + b * e^(c * size)`
 * with a = -0.0223, b = 0.185, c = -0.1745, size in px. It tightens as type grows, which is why
 * 14px gets -0.006em, 16px -0.011em and 22px -0.018em. The date figures are calibrated against
 * letters tracked this way (`ui.figures` adds `textTracking`).
 *
 * Weights: 400 is text; 500 is emphasis, the step Inter's optical size keeps clearly apart from
 * 400 at every size here (the font file carries 380 to 600, see `scripts/inter.py`). Nothing is
 * bolder: on a dark page 600 blooms. The share image (`og.tsx`) draws from a 400-only instance.
 */
export const typeScale = stylex.defineConsts({
  /** Labels: section names (About, Contact, Links), table headers, captions, small print. */
  labelSize: "14px",
  labelLeading: "20px",
  labelTracking: "-0.006em",
  /** Interface and running text: links, table rows, paragraphs. */
  textSize: "16px",
  textLeading: "24px",
  textTracking: "-0.011em",
  /** The name, the page under it, and a page's part headings: the one step above text. */
  headingSize: "22px",
  headingTracking: "-0.018em",
  textWeight: "400",
  emphasisWeight: "500",
  /**
   * Code: inline code, code blocks, the shell block (`markdown.tsx`, `command.tsx`). Commit Mono
   * at the text's size: its x-height is 540/1000 em, Inter's 1118/2048 (0.546 em), so at 16px the
   * mono's lowercase stands 8.64px tall beside Inter's 8.73px, the same optical size; at 14px it
   * read two sizes small. On the text's line, so a block of code keeps the page's rhythm. Inline
   * code takes the size only and sits on its sentence's line. Weight 400, the only one shipped.
   */
  monoSize: "16px",
  monoLeading: "24px",
});

/**
 * Each theme's page color, `colors.bg`, as plain strings: `theme.ts` sets the same values on
 * <html> and in `theme-color` before any CSS loads, so the first frame and the browser chrome are
 * the page itself.
 */
export const pageColor = { dark: "oklch(17% 0.005 25)", light: "oklch(97.5% 0.005 235)" };

/**
 * Monochrome, tinted: an ember forge page in the dark, a cold paper page in the light. Each
 * theme sits on one hue with a trace of chroma, below the point where a reader names a color
 * and above the point where a page reads as the browser's own black and white; pure 0 and 100
 * lightness are what makes a monochrome page look unstyled.
 *
 * Dark: hue 25 (ember red, the forge), chroma 0.005 on surfaces and 0.005 to 0.007 on text.
 * Chroma reads stronger on a dark page, so it is held low there: at 0.006 the old blue read as
 * purple, and the red keeps the same ceiling. Light: hue 235 (the blue of a cold page), chroma
 * 0.005 on surfaces and 0.01 on text.
 *
 * Both ends are pulled in from the extremes: the dark page is 17% lightness (about #120f0e),
 * its text 94% (about #eeeae9), so white text no longer glares against true black; the light
 * page is 97.5% (about #f4f7fa), its text 18% (about #0d1215).
 *
 * The text ladder keeps its steps in APCA. Dark, on the page: primary Lc 94, article 78,
 * secondary 56, tertiary 37 (WCAG 5.3:1). Light: primary Lc 100, article 96, secondary 84,
 * tertiary 71 (WCAG 4.9:1). Light tertiary is the lightest gray WCAG still allows for text,
 * which is why light is not a mirror of dark: gray on a light page reads fainter than on a dark
 * one, the reason light prose is heavier too (`proseWeight`).
 */
export const colors = stylex.defineVars({
  /**
   * Tells the browser which way the page is lit, for scrollbars, overscroll and other built-in
   * controls: either, following the system, unless the toggle forces one (`dark`, `lightTheme`).
   */
  scheme: "light dark",
  bg: { default: pageColor.dark, [light]: pageColor.light },
  primary: { default: "oklch(94% 0.005 25)", [light]: "oklch(18% 0.01 235)" },
  secondary: { default: "oklch(74% 0.006 25)", [light]: "oklch(42% 0.01 235)" },
  /** One more step down the text ladder: labels, dates, descriptors, quiet links at rest. */
  tertiary: { default: "oklch(62% 0.007 25)", [light]: "oklch(53% 0.01 235)" },
  article: { default: "oklch(86% 0.005 25)", [light]: "oklch(28% 0.01 235)" },
  /** Rules: the page's text at 12% opacity, so they take the tint of whatever is under them. */
  hairline: { default: "oklch(94% 0.005 25 / 0.12)", [light]: "oklch(18% 0.01 235 / 0.12)" },
  codeBg: { default: "oklch(23% 0.006 25)", [light]: "oklch(92.5% 0.006 235)" },
  terminalBg: { default: "oklch(19.5% 0.006 25)", [light]: "oklch(95.5% 0.005 235)" },
  /**
   * Heph's glass window (`heph.tsx`), the one lifted surface on the site; flat surfaces take a
   * line (`ui.edge`), not a shadow. `glass` is the terminal colour the wallpaper shows through:
   * 62% on the dark page, 82% on the light one, where a thinner pale tint over the dark painting
   * mixes into grey-brown. `glint` is light caught on the glass, white in both themes: mixed from
   * the text it went near-black on the light page. `shadow` is the dark under the window, on
   * each theme's own hue rather than pure black, which reads as a hole in a tinted page.
   */
  glass: { default: "oklch(19.5% 0.006 25 / 0.62)", [light]: "oklch(95.5% 0.005 235 / 0.82)" },
  glint: { default: "oklch(100% 0 0)", [light]: "oklch(100% 0 0)" },
  shadow: { default: "oklch(8% 0.005 25)", [light]: "oklch(12% 0.01 235)" },
  /** Muted text on terminal surfaces: 4.6:1 on the dark terminal, 5.0:1 on the light one. */
  terminalMuted: { default: "oklch(60% 0.007 25)", [light]: "oklch(51% 0.01 235)" },
  proseWeight: { default: "380", [light]: "400" },
  /**
   * How strong an underline is at rest, as a share of its link's text colour (`ui.outbound`); on
   * hover it is the full colour. Not a mirror, for the reason light prose is heavier: a thin light
   * line brightening on a dark page blooms and reads larger than its numbers, a thin dark line
   * darkening on paper does not. Dark: 50%, a step of 0.35 lightness to the hover. Light: 25%, a
   * step of 0.52, which reads as the same step. At 50% on paper the change could not be seen.
   */
  underlineRest: { default: "50%", [light]: "25%" },
  artworkFilter: { default: "none", [light]: "brightness(0)" },
  sunDisplay: { default: "block", [light]: "none" },
  moonDisplay: { default: "none", [light]: "block" },
});

export const dark = stylex.createTheme(colors, {
  scheme: "dark",
  bg: pageColor.dark,
  primary: "oklch(94% 0.005 25)",
  secondary: "oklch(74% 0.006 25)",
  tertiary: "oklch(62% 0.007 25)",
  article: "oklch(86% 0.005 25)",
  hairline: "oklch(94% 0.005 25 / 0.12)",
  codeBg: "oklch(23% 0.006 25)",
  terminalBg: "oklch(19.5% 0.006 25)",
  glass: "oklch(19.5% 0.006 25 / 0.62)",
  glint: "oklch(100% 0 0)",
  shadow: "oklch(8% 0.005 25)",
  terminalMuted: "oklch(60% 0.007 25)",
  proseWeight: "380",
  underlineRest: "50%",
  artworkFilter: "none",
  sunDisplay: "block",
  moonDisplay: "none",
});

export const lightTheme = stylex.createTheme(colors, {
  scheme: "light",
  bg: pageColor.light,
  primary: "oklch(18% 0.01 235)",
  secondary: "oklch(42% 0.01 235)",
  tertiary: "oklch(53% 0.01 235)",
  article: "oklch(28% 0.01 235)",
  hairline: "oklch(18% 0.01 235 / 0.12)",
  codeBg: "oklch(92.5% 0.006 235)",
  terminalBg: "oklch(95.5% 0.005 235)",
  glass: "oklch(95.5% 0.005 235 / 0.82)",
  glint: "oklch(100% 0 0)",
  shadow: "oklch(12% 0.01 235)",
  terminalMuted: "oklch(51% 0.01 235)",
  proseWeight: "400",
  underlineRest: "25%",
  artworkFilter: "brightness(0)",
  sunDisplay: "none",
  moonDisplay: "block",
});

/**
 * Vertical rhythm. The sidebar's link pitch is 32px (four units) and the table's row pitch 40px
 * (five); they meet every 160px. Contact's label sits on the table header, so with 8 lines of
 * contact and links and one pitch between the groups, "Links" lands on the fourth row and the
 * last link on the eighth. Grouping comes from the type, not from the spacing: labels are
 * smaller and grayer than the lines under them (`ui.label`), project names heavier than their
 * descriptors (`ui.emphasis`), so the rhythm can stay strict.
 */
export const space = stylex.defineVars({
  /**
   * The unit itself, for lengths derived from it elsewhere (`calc(n * unit)`): pads, insets and
   * gaps that are not one of the named spaces below.
   */
  unit: `${unit}px`,
  /**
   * How far a keyboard focus ring stands outside what it marks: half a unit. Rows have a unit of
   * padding above and below their text, so the ring sits halfway into it and never touches the
   * neighbouring row's words. The ring's corner is half the surface corner (`radius`).
   */
  focusOffset: `${unit / 2}px`,
  sectionGap: "24px",
  sectionContentGap: "6px",
  /** Intro to lists: the name to the links, About to the table. One sidebar pitch. */
  textMediaGap: "32px",
  linkLineHeight: { default: "24px", "@media (min-width: 768px)": "1.5rem" },
  /** The sidebar's line-to-line distance, and the gap between its two groups. */
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
  /**
   * Two units at the edge of a column that the theme toggle is centred on: its icon then stands
   * at the column's edge, flush with the dates' right edge when it sits over the table (dense)
   * and with the sidebar's left edge otherwise (`theme.tsx`).
   */
  toggleAxis: "16px",
  toggleOpticalOffset: "2px",
  /** The page's inset from the viewport edge on desktop: top of the sidebar and content, bottom of the footer. */
  pageInset: "48px",
  sidebarColumn: `${30 * unit}px`,
  contentColumn: `${68 * unit}px`,
  layoutGap: `${6 * unit}px`,
  /**
   * Case pages' banner where it fits (`media.banner`): the content column plus one layout gap on
   * each side, so it stands out from the text while staying symmetric about it and clear of the
   * sidebar. 80 units.
   */
  bannerColumn: `${(68 + 2 * 6) * unit}px`,
  /**
   * One unit: the corner of every surface: archive tiles, case images and banners (the demos'
   * frames too), code blocks, the shell block and Archetypon's previews. One corner, so the
   * surfaces read as one family. Inline code takes half (`calc(radius / 2)`): a chip at text size,
   * which a whole unit would round into a pill. Heph's window keeps macOS's own corner, as it
   * keeps macOS's lights (`heph.tsx`).
   */
  radius: `${unit}px`,
  tileGap: `${4 * unit}px`,
  tableGap,
  mobileTableGap: "clamp(8px, 3vw, 16px)",
  mobileCellEndSpace: "10px",
  dateColumn,
  titleColumn,
  /**
   * The project tables (homepage, next projects): project, subject, then the date set right, its
   * last figure on the table's right edge, where the hairlines end. Desktop: the title column a
   * unit multiple, the date as wide as its figures. Phones: content-sized, the subject taking
   * what is left.
   */
  projectColumns: {
    default: `${titleColumn} minmax(max-content, 1fr) max-content`,
    "@media (max-width: 767px)": "max-content minmax(0, 1fr) max-content",
  },
  /**
   * A settings table (Archetypon's formats): the name in the title column, so it lines up with
   * the project names; then three equal columns, the last value set right on the table's edge.
   * Desktop: 112px, then 128px each with the 16px gaps, so every column starts on a unit (0, 128,
   * 272, 416). A column never gets narrower than its values.
   */
  settingsColumns: {
    default: `${titleColumn} repeat(3, minmax(max-content, 1fr))`,
    "@media (max-width: 767px)": "max-content repeat(3, minmax(max-content, 1fr))",
  },
});

/** Put on a table row so its cells can react to the row's hover and focus. */
export const rowMarker = stylex.defineMarker();

/**
 * Put on <html>, which carries page-wide state: `data-dense` and `data-compact` when a desktop
 * viewport is too short for the full layout (see `align.ts`).
 */
export const rootMarker = stylex.defineMarker();

/** Put on a table row's descriptor cell so its text can loop when it does not fit (`descriptor.ts`). */
export const descriptorMarker = stylex.defineMarker();
