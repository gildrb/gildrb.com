import * as stylex from "@stylexjs/stylex";
import type { TargetedMouseEvent } from "preact";
import { useRef, useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { email } from "../site.ts";
import { colors, fontFeatures, space } from "../tokens.stylex.ts";
import { type Style, ui } from "../ui.tsx";

export function Email({ style, vars }: { style?: Style; vars?: Record<string, string> }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef(0);
  async function copy(event: TargetedMouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();
    const copied = await navigator.clipboard.writeText(email).then(
      () => true,
      () => false,
    );
    setState(copied ? "copied" : "failed");
    announce(copied ? "Email copied to clipboard" : "Email could not be copied");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1000);
  }
  return (
    <button
      {...stylex.props(
        ui.reset,
        ui.text,
        ui.quiet,
        ui.focusRing,
        styles.email,
        state === "failed" && styles.failed,
        style,
      )}
      style={vars}
      type="button"
      aria-label={`Copy ${email}`}
      onClick={copy}
    >
      {state === "idle" ? (
        <span data-nosnippet>{email}</span>
      ) : state === "copied" ? (
        "Copied"
      ) : (
        "Copy failed"
      )}
    </button>
  );
}

const styles = stylex.create({
  email: {
    lineHeight: space.linkLineHeight,
    paddingBlock: `calc(${space.linkGap} / 2)`,
    marginBlock: `calc(${space.linkGap} / -2)`,
    // An address is lowercase: its @ keeps the default form, not the capitals' one.
    fontFeatureSettings: fontFeatures.prose,
  },
  failed: { color: colors.secondary },
});
