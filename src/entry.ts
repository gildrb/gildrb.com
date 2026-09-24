import * as stylex from "@stylexjs/stylex";
import { media } from "./tokens.stylex.ts";

/**
 * Homepage entry. The name, the About line and the theme toggle are there from the first paint;
 * the project table and the links follow once those have been read, all settled within a second.
 * Only opacity and transform animate, so the motion stays on the compositor.
 */

// A critically damped spring (no overshoot), sampled for CSS `linear()`.
const spring =
  "linear(0, 0.078, 0.235, 0.401, 0.549, 0.669, 0.762, 0.831, 0.882, 0.918, 0.944, 0.962, 0.974, 0.982, 0.988, 0.992, 0.995, 0.996, 0.998, 0.998, 1)";

const duration = "550ms";
// Items go solid over the first 60% of the rise, then settle: they never look ghostly in motion.
const fadeDuration = "330ms";

/** Delays in milliseconds; the phone layout stacks the links below the table, so they wait longer. */
export const timing = {
  header: 70,
  row: (index: number) => 100 + index * 27,
  links: { desktop: 50, phone: 290 },
  /** Profile links then contact links, in DOM order; desktop reveals contacts first. */
  link: {
    desktop: [190, 220, 250, 280, 310, 340, 70, 100, 130, 160],
    phone: [315, 340, 370, 395, 425, 450, 315, 340, 370, 395],
  },
} as const;

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const riseIn = stylex.keyframes({
  from: { transform: "translateY(8px)" },
  to: { transform: "translateY(0)" },
});

/**
 * Runs in the homepage `<head>`: holds the entrance until Inter has loaded, so every arrow and
 * letter enters in the final face. Capped at one second so a slow or blocked font never hangs the
 * page. Without JavaScript nothing is held.
 */
export const entryGate = `const r=document.documentElement;r.style.setProperty("--entry-state","paused");const go=()=>r.style.removeProperty("--entry-state");document.fonts.load('400 16px Inter').then(go,go);setTimeout(go,1000)`;

/** Items set `--entry-delay` (and `--entry-delay-mobile` where phones differ) inline to stagger. */
export const entry = stylex.create({
  fade: {
    animationName: { default: null, [media.motion]: fadeIn },
    animationDuration: duration,
    animationTimingFunction: spring,
    animationFillMode: "both",
    animationPlayState: "var(--entry-state, running)",
    animationDelay: {
      default: "var(--entry-delay, 0ms)",
      [media.mobile]: "var(--entry-delay-mobile, var(--entry-delay, 0ms))",
    },
  },
  rise: {
    animationName: { default: null, [media.motion]: `${fadeIn}, ${riseIn}` },
    animationDuration: `${fadeDuration}, ${duration}`,
    animationTimingFunction: spring,
    animationFillMode: "both",
    animationPlayState: "var(--entry-state, running)",
    animationDelay: {
      default: "var(--entry-delay, 0ms)",
      [media.mobile]: "var(--entry-delay-mobile, var(--entry-delay, 0ms))",
    },
  },
});
