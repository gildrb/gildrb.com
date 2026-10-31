import * as stylex from "@stylexjs/stylex";
import { media, space } from "./tokens.stylex.ts";

/**
 * A veil across the top of the viewport on scrolling pages, after factory.com's: what scrolls up
 * under it dissolves into a heavy blur (64px, colors lifted 1.5x so they glow rather than grey
 * out), so the name over it stays readable. No tint: the blur alone carries it. A mask holds it
 * solid to just past the name, then eases it out in steps, so it has no visible lower edge.
 *
 * It starts above the viewport: 24px above it, plus the top safe area (the notch and status bar
 * that `viewport-fit=cover` lays the page under on phones). A blur ending exactly at the top edge
 * thins out there and leaves a sharp strip; started above, it stays full to the edge, and on a
 * phone it also covers what passes under the status bar.
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
const above = `calc(3 * ${space.unit} + env(safe-area-inset-top, 0px))`;
/**
 * How far down the veil is solid, from its top: 38px into the viewport on desktop, as
 * factory.com's; on phones past the name bar's two lines (80px) and a unit, since the name lies
 * over the text. Below it, factory.com's fade: 78% after 33px, 42% after 74px, none after 121px.
 */
const solidDesktop = `calc(${above} + 38px)`;
const solidPhone = `calc(${above} + 11 * ${space.unit})`;
const fadeDesktop = `linear-gradient(black ${solidDesktop}, rgb(0 0 0 / 0.78) calc(${solidDesktop} + 33px), rgb(0 0 0 / 0.42) calc(${solidDesktop} + 74px), transparent calc(${solidDesktop} + 121px))`;
const fadePhone = `linear-gradient(black ${solidPhone}, rgb(0 0 0 / 0.78) calc(${solidPhone} + 33px), rgb(0 0 0 / 0.42) calc(${solidPhone} + 74px), transparent calc(${solidPhone} + 121px))`;

const rise = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

const styles = stylex.create({
  veil: {
    display: { default: "none", [scrollDriven]: "block" },
    position: "fixed",
    insetInline: 0,
    top: `calc(-1 * ${above})`,
    height: {
      default: `calc(${solidDesktop} + 121px)`,
      [media.mobile]: `calc(${solidPhone} + 121px)`,
    },
    zIndex: 99,
    pointerEvents: "none",
    opacity: 0,
    animationName: rise,
    animationTimingFunction: "linear",
    animationFillMode: "both",
    animationTimeline: "scroll(root)",
    animationRange: `0 ${space.pageInset}`,
    backdropFilter: "blur(64px) saturate(1.5)",
    maskImage: { default: fadeDesktop, [media.mobile]: fadePhone },
  },
});
