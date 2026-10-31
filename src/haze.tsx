import * as stylex from "@stylexjs/stylex";
import { colors, media, space } from "./tokens.stylex.ts";

/**
 * How strong the haze is down the band: full at the viewport's top edge, none at the band's
 * bottom, so text wavers more the higher it rises and nothing jumps where the band ends. An
 * image, since a filter has no gradient primitive of its own; `img-src data:` allows it.
 */
const falloff = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none"><linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><rect width="1" height="1" fill="url(#g)"/></svg>',
)}`;

/**
 * Noise stretched sideways (low x frequency, high y frequency) makes thin horizontal bands, so
 * each line of text bends on its own, as air over a forge bends it. The noise is made opaque,
 * then pulled toward 0.5, the displacement map's "no movement", by `falloff`:
 * `noise * fade + 0.5 * (1 - fade)`.
 */
function HazeFilter({ id, moving }: { id: string; moving: boolean }) {
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.06" numOctaves={2} seed={7}>
        {moving && (
          <animate
            attributeName="baseFrequency"
            dur="6s"
            values="0.004 0.06;0.005 0.075;0.004 0.06"
            repeatCount="indefinite"
          />
        )}
      </feTurbulence>
      <feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0 1" result="noise" />
      <feImage href={falloff} preserveAspectRatio="none" result="fade" />
      <feComposite
        in="noise"
        in2="fade"
        operator="arithmetic"
        k1={1}
        k2={0}
        k3={-0.5}
        k4={0.5}
        result="map"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={8}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  );
}

/**
 * A heat haze across the top of the viewport on scrolling pages: what scrolls up under it wavers,
 * then blurs and sinks into the page color, so the name over it stays readable (after
 * docs.x.ai's top band: blur, a page-color gradient, and a mask that fades both out).
 *
 * Two layers. The lower one bends the page through an SVG filter (`HazeFilter`); browsers that do
 * not take a filter reference in `backdrop-filter` skip it and keep the upper one, a blur under a
 * page-color gradient, which alone is the docs.x.ai band. The haze shimmers on a 6s loop; with
 * reduced motion it holds still.
 *
 * The band rises in over the first 48px of scroll (the page's top inset), so at rest it covers
 * nothing: the page's first line starts below it. Browsers without scroll-driven animations show
 * no band. The sidebar and the phone name bar sit above it (z-index 100).
 */
export function Haze() {
  return (
    <>
      <svg {...stylex.props(styles.defs)} aria-hidden="true" focusable="false">
        <HazeFilter id="haze" moving />
        <HazeFilter id="haze-still" moving={false} />
      </svg>
      <div {...stylex.props(styles.band, styles.haze)} aria-hidden="true" />
      <div {...stylex.props(styles.band, styles.veil)} aria-hidden="true" />
    </>
  );
}

const scrollDriven = "@supports (animation-timeline: scroll())";
const still = "@media (prefers-reduced-motion: reduce)";

const rise = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

const styles = stylex.create({
  defs: { position: "absolute", width: 0, height: 0, overflow: "hidden" },
  band: {
    display: { default: "none", [scrollDriven]: "block" },
    position: "fixed",
    insetInline: 0,
    top: 0,
    // Phones: the name bar is two lines tall and lies over the text, so the band runs further
    // down and starts in the solid page color, as docs.x.ai's does on small screens.
    height: { default: `calc(12 * ${space.unit})`, [media.mobile]: `calc(16 * ${space.unit})` },
    zIndex: 99,
    pointerEvents: "none",
    animationName: rise,
    animationTimingFunction: "linear",
    animationFillMode: "both",
    animationTimeline: "scroll(root)",
    animationRange: `0 ${space.pageInset}`,
  },
  haze: { backdropFilter: { default: "url(#haze)", [still]: "url(#haze-still)" } },
  veil: {
    backdropFilter: "blur(6px)",
    backgroundImage: {
      default: `linear-gradient(color-mix(in oklch, ${colors.bg} 75%, transparent), transparent)`,
      [media.mobile]: `linear-gradient(${colors.bg}, transparent)`,
    },
    maskImage: {
      default: "linear-gradient(black 30%, transparent)",
      [media.mobile]: "linear-gradient(black 50%, transparent)",
    },
  },
});
