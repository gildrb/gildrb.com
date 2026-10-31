import * as stylex from "@stylexjs/stylex";
import { colors, media, space } from "./tokens.stylex.ts";

/**
 * A veil across the top of the viewport on scrolling pages, after docs.x.ai's: what scrolls up
 * under it blurs and sinks into the page color, so the name over it stays readable. A backdrop
 * blur under a page-color gradient, both faded out toward the bottom by a mask.
 *
 * It rises in over the first 48px of scroll (the page's top inset), so at rest it covers nothing:
 * the page's first line starts below it. It is hidden unless the scroll timeline drives it: a page
 * that does not scroll has an inactive timeline, and browsers without scroll-driven animations have
 * none. The sidebar and the phone name bar sit above it (z-index 100).
 */
export function Veil() {
  return <div {...stylex.props(styles.veil)} aria-hidden="true" />;
}

const scrollDriven = "@supports (animation-timeline: scroll())";

const rise = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

const styles = stylex.create({
  veil: {
    display: { default: "none", [scrollDriven]: "block" },
    position: "fixed",
    insetInline: 0,
    top: 0,
    // Phones: the name bar is two lines tall and lies over the text, so the veil runs further
    // down and starts in the solid page color, as docs.x.ai's does on small screens.
    height: { default: `calc(12 * ${space.unit})`, [media.mobile]: `calc(16 * ${space.unit})` },
    zIndex: 99,
    pointerEvents: "none",
    opacity: 0,
    animationName: rise,
    animationTimingFunction: "linear",
    animationFillMode: "both",
    animationTimeline: "scroll(root)",
    animationRange: `0 ${space.pageInset}`,
    backdropFilter: "blur(8px)",
    backgroundImage: {
      default: `linear-gradient(color-mix(in oklch, ${colors.bg} 75%, transparent), transparent)`,
      [media.mobile]: `linear-gradient(${colors.bg}, transparent)`,
    },
    maskImage: "linear-gradient(black, black, transparent)",
  },
});
