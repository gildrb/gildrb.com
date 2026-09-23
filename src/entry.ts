import * as stylex from "@stylexjs/stylex";
import { media } from "./tokens.stylex.ts";

const fadeIn = stylex.keyframes({
  from: { opacity: 0, filter: "blur(6px)" },
  to: { opacity: 1, filter: "blur(0)" },
});

const riseIn = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(12px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

/**
 * Homepage entry motion. Items set `--entry-delay` (and `--entry-delay-mobile` where the
 * phone layout reorders them) inline to stagger.
 */
export const entry = stylex.create({
  fade: {
    animationName: { default: null, [media.motion]: fadeIn },
    animationDuration: "700ms",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    animationFillMode: "both",
    animationDelay: {
      default: "var(--entry-delay, 80ms)",
      [media.mobile]: "var(--entry-delay-mobile, var(--entry-delay, 80ms))",
    },
  },
  rise: {
    animationName: { default: null, [media.motion]: riseIn },
    animationDuration: "900ms",
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    animationFillMode: "both",
    animationDelay: {
      default: "var(--entry-delay, 120ms)",
      [media.mobile]: "var(--entry-delay-mobile, var(--entry-delay, 120ms))",
    },
  },
});
