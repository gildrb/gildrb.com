import * as stylex from "@stylexjs/stylex";
import { colors, figureUnits, fontFeatures, media, space } from "./tokens.stylex.ts";

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
  mono: { fontFamily: '"Ioskeley Mono", "SFMono-Regular", "SF Mono", Menlo, Consolas, monospace' },
  focusRing: {
    outline: { default: null, ":focus-visible": `1px solid ${colors.primary}` },
    outlineOffset: "4px",
  },
  /** Interface text: pixel-fixed on phones, `rem`-scaled from tablets up. */
  text: {
    fontSize: { default: "16px", [media.desktop]: "1rem" },
    fontWeight: 400,
    lineHeight: space.linkLineHeight,
  },
  /** The one heading style: the site name, breadcrumb, and every case-study heading. */
  heading: {
    fontSize: "19px",
    fontWeight: 400,
    letterSpacing: "-0.02em",
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
   * Secondary links. Hover (where there is hover), keyboard focus and a finger's press all raise
   * them to full contrast, in place of the browser's grey tap flash.
   */
  quiet: {
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
      ":active": colors.primary,
    },
    textDecoration: "none",
    width: "fit-content",
    touchAction: "manipulation",
    userSelect: "none",
  },
  /** Marks a link that leaves the site; the arrow keeps Inter's drawing in monospace pages. */
  outbound: {
    "::after": {
      content: '" ↗"',
      fontFamily:
        'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  },
  /**
   * Tabular digits at the density of the words beside them. Inter centres each tabular figure in
   * a cell as wide as its widest digit (1328 of 2048 units), and even its proportional digits
   * sit looser than its letters. Every gap in a date is brought to the mean ink-to-ink gap
   * between the letters of the table (229.8 units), measured from the outlines at weight 400
   * across every date from 2000 to 2099. A date then averages the width of a proportional one.
   */
  figures: {
    fontVariantNumeric: "tabular-nums",
    letterSpacing: `calc(${figureUnits.digit} / ${figureUnits.unitsPerEm} * 1em)`,
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
