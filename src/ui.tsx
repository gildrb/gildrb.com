import * as stylex from "@stylexjs/stylex";
import { colors, media, space } from "./tokens.stylex.ts";

/** Anything `stylex.props` accepts: a style, `false`, `null`, or a nested array of them. */
export type Style = stylex.StyleXArray<stylex.CompiledStyles | boolean | null | undefined>;

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
  quiet: {
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
    },
    textDecoration: "none",
    width: "fit-content",
  },
});
