import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { colors, media, space, typeScale } from "../tokens.stylex.ts";
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
    <div {...stylex.props(ui.codeSurface, ui.edge, styles.block)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(ui.label)} aria-hidden="true">
          Terminal
        </span>
        <button
          {...stylex.props(
            ui.reset,
            ui.respond,
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
      <code {...stylex.props(ui.mono, styles.lines)}>
        {commands.map((command) => (
          <span key={command} {...stylex.props(styles.line)}>
            <span {...stylex.props(styles.prompt)} aria-hidden="true">
              $
            </span>
            <span {...stylex.props(styles.command)}>{command}</span>
          </span>
        ))}
      </code>
    </div>
  );
}

/**
 * A shell block: a header row over the commands, as the project table's header sits over its
 * rows, on `ui.codeSurface` with `ui.edge`. Every command is always shown whole.
 * - The block spans the text column, so a command has the column's whole width.
 * - The header is one row pitch (40px): "Terminal" as a label, the copy button (a 32px target,
 *   four units) half a unit from the right edge, a hairline under it. Moving the button off the
 *   commands' line gives them the full width, as Vercel's docs do.
 * - The commands take `pre`'s inset (`markdown.tsx`): a unit above and below, two at the sides.
 *   A one-line block is 80px, two row pitches.
 * - Each line is two columns: the `$`, then the command. A command wider than the column wraps
 *   inside its own column, under its first character, never under the `$`, so it never runs past
 *   the edge. Copying still gives one command per line.
 */
const styles = stylex.create({
  block: { display: "grid", width: "100%" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: `calc(${space.portfolioRowPadding} * 2 + ${space.linkLineHeight})`,
    paddingLeft: `calc(2 * ${space.unit})`,
    paddingRight: `calc(${space.unit} / 2)`,
    boxShadow: `inset 0 -1px ${colors.hairline}`,
  },
  lines: {
    display: "grid",
    rowGap: 0,
    paddingBlock: space.unit,
    paddingInline: `calc(2 * ${space.unit})`,
    color: colors.primary,
    fontSize: typeScale.monoSize,
    lineHeight: typeScale.monoLeading,
  },
  /** The `$` and the space after it (one advance: `1ch` in a monospace font), then the command. */
  line: { display: "grid", gridTemplateColumns: "2ch minmax(0, 1fr)" },
  prompt: { color: colors.tertiary, userSelect: "none" },
  command: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  /** A 32px target; hover and focus raise the icon to full contrast, as a quiet link (`ui.quiet`). */
  copy: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: space.toggleSize,
    height: space.toggleSize,
    borderRadius: `calc(${space.radius} / 2)`,
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
    },
  },
  done: { color: colors.primary },
  /** Two units: the label's 14px plus its own stroke's room, centred in the target. */
  icon: {
    width: `calc(2 * ${space.unit})`,
    height: `calc(2 * ${space.unit})`,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
});
