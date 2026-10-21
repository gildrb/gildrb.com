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
        {...stylex.props(ui.reset, ui.focusRing, styles.copy, state === "copied" && styles.done)}
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
    alignItems: "flex-start",
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
  copy: {
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    width: "32px",
    height: "32px",
    borderRadius: "2px",
    color: { default: colors.tertiary, ":hover": { "@media (hover: hover)": colors.primary } },
    backgroundColor: {
      default: "transparent",
      ":hover": { "@media (hover: hover)": colors.codeBg },
    },
  },
  done: { color: colors.primary },
  icon: {
    width: "16px",
    height: "16px",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
});
