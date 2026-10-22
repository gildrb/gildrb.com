import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "preact/hooks";
import { colors } from "../tokens.stylex.ts";

type Player = { goToAndStop(frame: number, isFrame: boolean): void; destroy(): void };
type Lottie = { loadAnimation(options: Record<string, unknown>): Player };
type Animation = { op: number };

function isLottie(value: unknown): value is Lottie {
  return (
    typeof value === "object" &&
    value !== null &&
    "loadAnimation" in value &&
    typeof value.loadAnimation === "function"
  );
}

function isAnimation(value: unknown): value is Animation {
  return (
    typeof value === "object" && value !== null && "op" in value && typeof value.op === "number"
  );
}

/** Loads lottie-web's player once, from the classic script davis7.sh ships with. */
function loadLottie(src: string): Promise<Lottie> {
  const present: unknown = Reflect.get(globalThis, "lottie");
  if (isLottie(present)) return Promise.resolve(present);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", () => {
      const loaded: unknown = Reflect.get(globalThis, "lottie");
      if (isLottie(loaded)) resolve(loaded);
      else reject(new Error("lottie-web loaded without a lottie global"));
    });
    script.addEventListener("error", () => reject(new Error(`Could not load ${src}`)));
    document.head.append(script);
  });
}

// Without a pointer, the animation turns one way, rests, and turns back.
const restFor = 1.6;
const turnFor = 0.9;
// How far the folded mark moves right to sit centred, in percent of the animation's width.
const markShift = 30;

/**
 * The davis7.sh header animation, large: the name "Ben Davis" folds into the db mark. Moving the
 * pointer across the stage scrubs it, left the name, right the mark; without a pointer it plays
 * back and forth. With `fill`, the stage fills the banner window of the case page; otherwise it
 * keeps 4:3.
 */
export function Fold({
  fill,
  player,
  animation,
}: {
  fill: boolean;
  player: string;
  animation: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let lottie: Player | undefined;
    let frame = 0;
    let disposed = false;
    const start = async () => {
      const [library, response] = await Promise.all([
        loadLottie(player),
        fetch(animation, { signal: controller.signal }),
      ]);
      if (!response.ok) throw new Error(`Could not load ${animation}: ${response.status}`);
      const data: unknown = await response.json();
      const container = art.current;
      if (disposed || !container || !isAnimation(data)) return;
      lottie = library.loadAnimation({
        container,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
      const end = data.op - 1;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let position = reduced ? end : 0;
      lottie.goToAndStop(position, true);
      if (reduced) container.style.translate = `${markShift}% 0`;
      setReady(true);
      if (reduced) return;
      let last = performance.now();
      let clock = 0;
      const tick = (now: number) => {
        const step = Math.min(0.05, (now - last) / 1000);
        last = now;
        clock += step;
        const cycle = 2 * (restFor + turnFor);
        const phase = clock % cycle;
        const auto =
          phase < restFor
            ? 0
            : phase < restFor + turnFor
              ? (phase - restFor) / turnFor
              : phase < 2 * restFor + turnFor
                ? 1
                : 1 - (phase - 2 * restFor - turnFor) / turnFor;
        const goal = (pointer.current ?? auto) * end;
        // The pointer leads; the animation follows a little behind it, like a hand on a dial.
        position +=
          (goal - position) * (1 - Math.exp(-step * (pointer.current === null ? 30 : 12)));
        lottie?.goToAndStop(position, true);
        // The name is centred and the mark sits at its left end: slide it to the centre as it folds.
        container.style.translate = `${((position / end) * markShift).toFixed(2)}% 0`;
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    start().catch((error: unknown) => {
      if (!controller.signal.aborted) console.error(error);
    });
    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      lottie?.destroy();
    };
  }, [player, animation]);

  const aim = (event: PointerEvent) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    // The middle half of the stage covers the whole turn, so both ends are easy to reach.
    const x = (event.clientX - box.left) / box.width;
    pointer.current = Math.min(1, Math.max(0, (x - 0.25) * 2));
  };

  return (
    <div
      ref={stage}
      {...stylex.props(styles.stage, fill && styles.fill)}
      onPointerMove={aim}
      onPointerLeave={() => {
        pointer.current = null;
      }}
    >
      <div
        ref={art}
        role="img"
        aria-label="The name Ben Davis folding into the db mark"
        {...stylex.props(styles.art, ready && styles.ready)}
      />
    </div>
  );
}

const small = "@container (max-width: 560px)";
// The case pages' banner window (see `styles.window` in markdown.tsx).
const banner = "@media (min-width: 1280px)";

const styles = stylex.create({
  stage: {
    position: "relative",
    width: "100%",
    minWidth: 0,
    aspectRatio: "4 / 3",
    overflow: "hidden",
    containerType: "size",
    backgroundColor: colors.bg,
    borderRadius: { default: null, [small]: "15px" },
    cursor: "ew-resize",
    // The banner's frame: the hairline of the homepage table's rows, drawn over the artwork.
    "::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      boxShadow: `inset 0 0 0 1px ${colors.hairline}`,
      pointerEvents: "none",
    },
  },
  fill: { height: { default: null, [banner]: "100%" } },
  // The animation is drawn in white; the light theme prints it black, like the other marks.
  art: {
    position: "absolute",
    inset: 0,
    margin: "auto",
    width: "78%",
    height: "40%",
    opacity: 0,
    filter: colors.artworkFilter,
    pointerEvents: "none",
  },
  ready: { opacity: 1 },
});
