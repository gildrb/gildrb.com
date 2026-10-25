import * as stylex from "@stylexjs/stylex";
import {
  colors,
  figureUnits,
  fontFeatures,
  media,
  motion,
  rowMarker,
  space,
  typeScale,
  underline,
} from "./tokens.stylex.ts";

/** Anything `stylex.props` accepts: a style, `false`, `null`, or a nested array of them. */
export type Style = stylex.StyleXArray<stylex.CompiledStyles | boolean | null | undefined>;

/**
 * Keeps names (people, projects) out of browser translation. Preact types `translate` as a
 * boolean and drops `false` from the server HTML; the HTML attribute is the string "no", so it
 * is spread as a plain attribute.
 */
export const untranslated: Readonly<Record<string, string>> = { translate: "no" };

export const ui = stylex.create({
  sans: {
    fontFamily:
      'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  mono: { fontFamily: '"Commit Mono", "SFMono-Regular", "SF Mono", Menlo, Consolas, monospace' },
  focusRing: {
    outline: { default: null, ":focus-visible": `1px solid ${colors.primary}` },
    outlineOffset: space.focusOffset,
    borderRadius: { default: null, ":focus-visible": `calc(${space.radius} / 2)` },
  },
  /**
   * The edge of every flat surface: code, screenshots, recordings. A line where the surface ends,
   * no shadow: shadows lift, and only Heph's glass window is lifted (`colors.shadow`). The line is the page's hairline
   * (`colors.hairline`, the text at 12%): semi-transparent, so it takes the tint of whatever is
   * under it and stays crisp on a light image and a dark one alike. Drawn as an outline one pixel
   * inside (`outline-offset: -1px`), it paints over the surface's own content, which an inset
   * shadow does not on an image, and never adds to the size: a one-line shell block is 40px, the
   * table's row pitch. It follows the corner. Logo marks take none: they have no edge to draw.
   */
  edge: {
    outlineWidth: "1px",
    outlineStyle: "solid",
    outlineColor: colors.hairline,
    outlineOffset: "-1px",
  },
  /**
   * The code surface: inline code, code blocks, the shell block. The fill one step off the page
   * (`colors.codeBg`), the surface corner (`space.radius`); set with `edge`.
   */
  codeSurface: {
    backgroundColor: colors.codeBg,
    borderRadius: space.radius,
  },
  /** Interface text: pixel-fixed on phones, `rem`-scaled from tablets up. */
  text: {
    fontSize: { default: typeScale.textSize, [media.desktop]: "1rem" },
    fontWeight: typeScale.textWeight,
    lineHeight: space.linkLineHeight,
    letterSpacing: typeScale.textTracking,
  },
  /**
   * A label over a group: section names, table headers, captions. The label size on the text's
   * line box, so a label row keeps the rhythm of the rows under it.
   */
  label: {
    fontSize: typeScale.labelSize,
    fontWeight: typeScale.textWeight,
    lineHeight: space.linkLineHeight,
    letterSpacing: typeScale.labelTracking,
    color: colors.tertiary,
  },
  /** The thing named, against what is said about it: project titles, the page in the breadcrumb. */
  emphasis: { fontWeight: typeScale.emphasisWeight },
  /**
   * The step above text, on the text's line: the name (on every page, in one place), the page's
   * title under it, and a page's part headings. Pixel-fixed on phones, `rem`-scaled from tablets
   * up, as `text` is.
   */
  heading: {
    fontSize: { default: typeScale.headingSize, [media.desktop]: "1.375rem" },
    fontWeight: typeScale.emphasisWeight,
    lineHeight: space.linkLineHeight,
    letterSpacing: typeScale.headingTracking,
    color: colors.primary,
    textWrap: "balance",
  },
  /** Running text: no line ends on a lone word, and hyphens sit among lowercase letters. */
  prose: { textWrap: "pretty", fontFeatureSettings: fontFeatures.prose },
  /**
   * On phones, a text-sized control that stands alone (breadcrumb, table header) answers to at
   * least one touch target around its center, without moving any layout. Link lists do not use
   * it: their links pad into the list's gap, so their hit areas already meet.
   */
  target: {
    position: "relative",
    "::before": {
      content: { default: null, [media.mobile]: '""' },
      position: "absolute",
      top: "50%",
      left: "50%",
      width: `max(100%, ${space.touchTarget})`,
      height: `max(100%, ${space.touchTarget})`,
      transform: "translate(-50%, -50%)",
    },
  },
  reset: {
    appearance: "none",
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    lineHeight: "inherit",
    // Browsers reset a button's font features; controls take the page's, case forms included.
    fontFeatureSettings: "inherit",
    textAlign: "left",
    cursor: "pointer",
    touchAction: "manipulation",
    userSelect: "none",
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  /**
   * The one way a state change shows. Hover, focus or selection changes a color (text, underline,
   * background) or an opacity; nothing moves. Entering the state is immediate, so a pointer
   * crossing a list lights each row as it passes; leaving it fades over `motion.response`. The
   * state is the element's own, or its row's (`rowMarker`), the only ancestor that carries hover
   * for its descendants. The theme script turns transitions off
   * while the whole page changes color (`theme.ts`).
   */
  respond: {
    transitionProperty: "color, text-decoration-color, background-color, opacity",
    transitionDuration: {
      default: motion.response,
      ":hover": "0s",
      ":focus-visible": "0s",
      ":is([aria-current])": "0s",
      [stylex.when.ancestor(":hover", rowMarker)]: "0s",
      [stylex.when.ancestor(":focus-visible", rowMarker)]: "0s",
    },
    transitionTimingFunction: motion.responseEasing,
  },
  /**
   * Secondary links. Hover (where there is hover) and keyboard focus raise them to full
   * contrast; a finger's press shows nothing. Set with `respond`.
   */
  quiet: {
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
    },
    textDecoration: "none",
    width: "fit-content",
    touchAction: "manipulation",
    userSelect: "none",
  },
  /**
   * The site's one underline: article links, the Sources line, external project names,
   * Archetypon's links and settings. Set with `respond`.
   * - At rest the line is the link's own text colour at `colors.underlineRest` (50% dark, 25%
   *   light), so it follows any link colour and never drifts to a grey of its own.
   * - Hover, focus, and the hover of the row it sits in turn it the full text colour.
   */
  outbound: {
    textDecorationLine: "underline",
    textDecorationThickness: underline.thickness,
    textUnderlineOffset: underline.offset,
    textDecorationColor: {
      default: `color-mix(in oklch, currentColor ${colors.underlineRest}, transparent)`,
      ":hover": { [media.hover]: "currentColor" },
      ":focus-visible": "currentColor",
      [stylex.when.ancestor(":hover", rowMarker)]: { [media.hover]: "currentColor" },
      [stylex.when.ancestor(":focus-visible", rowMarker)]: "currentColor",
    },
  },
  /**
   * Tabular digits at the density of the words beside them. Inter centres each tabular figure in
   * a cell as wide as its widest digit (1328 of 2048 units), and even its proportional digits
   * sit looser than its letters. Every gap in a date is brought to the mean ink-to-ink gap
   * between the letters of the table (229.8 units), measured from the outlines at weight 400
   * across every date from 2000 to 2099, with the letters untracked. The text's tracking is then
   * added, as it is to every letter gap, so a date stays at the density of its row.
   */
  figures: {
    fontVariantNumeric: "tabular-nums",
    letterSpacing: `calc(${figureUnits.digit} / ${figureUnits.unitsPerEm} * 1em + ${typeScale.textTracking})`,
  },
  /** A date's hyphen, set proportionally, with the gaps on each side matched as above. */
  separator: {
    marginInlineStart: `calc(${figureUnits.beforeHyphen} / ${figureUnits.unitsPerEm} * 1em)`,
    marginInlineEnd: `calc(${figureUnits.afterHyphen} / ${figureUnits.unitsPerEm} * 1em)`,
  },
});

/**
 * Sets an ISO date (`2026-09-08`, `2026-09`) in steady columns: tabular digits, proportional
 * hyphens. Only the digits take `tnum`, since Inter's tabular set also widens the hyphen to a
 * digit's width; the spacing is corrected so the date reads at the density of its row.
 */
export function Figures({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\d+|-)/)
        .filter((part) => part !== "")
        .map((part) =>
          part === "-" ? (
            <span {...stylex.props(ui.separator)}>-</span>
          ) : /^\d+$/.test(part) ? (
            <span {...stylex.props(ui.figures)}>{part}</span>
          ) : (
            part
          ),
        )}
    </>
  );
}
