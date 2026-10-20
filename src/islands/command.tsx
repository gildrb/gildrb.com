import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { colors } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";

/** One shell command in a pill, with a button that copies it (product pages). */
export function Command({ command }: { command: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef(0);
  async function copy() {
    const copied = await navigator.clipboard.writeText(command).then(
      () => true,
      () => false,
    );
    setState(copied ? "copied" : "failed");
    announce(copied ? "Command copied to clipboard" : "Command could not be copied");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1200);
  }
  return (
    <div {...stylex.props(styles.pill)}>
      <span {...stylex.props(ui.mono, styles.prompt)} aria-hidden="true">
        $
      </span>
      <code {...stylex.props(ui.mono, styles.command)}>{command}</code>
      <button
        {...stylex.props(ui.reset, ui.focusRing, styles.copy, state === "copied" && styles.done)}
        type="button"
        aria-label={state === "failed" ? "Copy failed" : `Copy ${command}`}
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
  pill: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "fit-content",
    maxWidth: "100%",
    minHeight: "40px",
    paddingBlock: "4px",
    paddingLeft: "16px",
    paddingRight: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.hairline,
    borderRadius: "999px",
  },
  prompt: { flexShrink: 0, color: colors.tertiary, fontSize: "14px", lineHeight: "20px" },
  command: {
    minWidth: 0,
    overflowX: "auto",
    whiteSpace: "pre",
    scrollbarWidth: "none",
    color: colors.primary,
    fontSize: "14px",
    lineHeight: "20px",
  },
  copy: {
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    width: "32px",
    height: "32px",
    borderRadius: "999px",
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
