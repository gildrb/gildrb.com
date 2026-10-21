import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { colors } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";

/**
 * One shell block (product pages): each line a command after a `$`, and one button that copies
 * them all, so a paste runs them in order.
 */
export function Command({ commands }: { commands: readonly string[] }) {
  const text = commands.join("\n");
  const single = commands.length === 1;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef(0);
  async function copy() {
    const copied = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
    setState(copied ? "copied" : "failed");
    const what = single ? "Command" : "Commands";
    announce(copied ? `${what} copied to clipboard` : `${what} could not be copied`);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1200);
  }
  return (
    <div {...stylex.props(styles.block, single ? styles.pill : styles.box)}>
      <code {...stylex.props(ui.mono, styles.lines)}>
        {commands.map((command) => (
          <span key={command} {...stylex.props(styles.line)}>
            <span {...stylex.props(styles.prompt)} aria-hidden="true">
              ${" "}
            </span>
            {command}
          </span>
        ))}
      </code>
      <button
        {...stylex.props(
          ui.reset,
          ui.mono,
          ui.focusRing,
          styles.copy,
          state === "copied" && styles.done,
        )}
        type="button"
        aria-label={
          state === "failed" ? "Copy failed" : single ? `Copy ${text}` : "Copy the commands"
        }
        onClick={() => void copy()}
      >
        {state === "copied" ? (
          <svg {...stylex.props(styles.icon)} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
        ) : (
          <svg {...stylex.props(styles.icon)} viewBox="0 0 16 16" aria-hidden="true">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
            <path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" />
          </svg>
        )}
      </button>
    </div>
  );
}

const styles = stylex.create({
  block: {
    display: "flex",
    // The copy icon sits on the first command's baseline (see `copy`).
    alignItems: "baseline",
    gap: "10px",
    width: "fit-content",
    maxWidth: "100%",
    paddingBlock: "4px",
    paddingLeft: "16px",
    paddingRight: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.codeBorder,
  },
  /** Square-ish like the rest of the site: a 4px corner, one line or many. */
  pill: { borderRadius: "4px" },
  box: { borderRadius: "4px", paddingBlock: "8px", paddingRight: "8px" },
  lines: {
    display: "grid",
    minWidth: 0,
    paddingBlock: "6px",
    overflowX: "auto",
    scrollbarWidth: "none",
    color: colors.primary,
    fontSize: "14px",
    lineHeight: "20px",
  },
  line: { whiteSpace: "pre" },
  prompt: { color: colors.tertiary, userSelect: "none" },
  /**
   * A 32px target set in the commands' own type, line and padding, so its baseline is the first
   * command's: an empty text line (`::before`) gives it one. The icon is one cap height tall on
   * that baseline: it spans the capitals and follows the text at any size.
   */
  copy: {
    flexShrink: 0,
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    minWidth: "32px",
    fontSize: "14px",
    lineHeight: "20px",
    // A shorthand, so it wins over the reset's own `padding: 0`.
    padding: "6px 8px",
    "::before": { content: '"\\200b"' },
    // A plate behind the icon on hover shows the button's whole 32px target; its corner follows
    // the block's.
    borderRadius: "4px",
    color: { default: colors.tertiary, ":hover": { "@media (hover: hover)": colors.primary } },
    backgroundColor: {
      default: "transparent",
      ":hover": { "@media (hover: hover)": colors.codeBg },
      ":focus-visible": colors.codeBg,
    },
  },
  done: { color: colors.primary },
  icon: {
    blockSize: "1cap",
    inlineSize: "auto",
    overflow: "visible",
    fill: "none",
    stroke: "currentColor",
    // Drawn on a 16-unit grid and shown at cap height (about 10px): a heavier stroke keeps the
    // line as thick as the text's strokes.
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
});
