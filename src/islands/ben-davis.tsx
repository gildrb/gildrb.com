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
 * The davis7.sh header animation, large: the name "Ben Davis" folds into the db mark. Hovering the
 * stage folds it into the mark and leaving unfolds it; without a pointer it plays back and forth. With `fill`, the stage fills the banner window of the case page; otherwise it
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
  const hovered = useRef(false);
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
      // Progress through the fold, 0 the name and 1 the mark. It moves at one fixed speed and is
      // drawn through an ease, so every turn takes the same time and has the same shape.
      let progress = reduced ? 1 : 0;
      lottie.goToAndStop(progress * end, true);
      if (reduced) container.style.translate = `${markShift}% 0`;
      setReady(true);
      if (reduced) return;
      let last = performance.now();
      let clock = 0;
      // Without a pointer it rests on one end, turns, rests on the other, and turns back.
      let idleGoal = 0;
      let restUntil = restFor;
      const tick = (now: number) => {
        const step = Math.min(0.05, (now - last) / 1000);
        last = now;
        clock += step;
        if (hovered.current) idleGoal = 0;
        else if (progress === idleGoal && clock >= restUntil) idleGoal = 1 - idleGoal;
        const goal = hovered.current ? 1 : idleGoal;
        if (progress !== goal) {
          const left = goal - progress;
          const move = step / turnFor;
          progress = Math.abs(left) <= move ? goal : progress + Math.sign(left) * move;
          if (progress === goal) restUntil = clock + restFor;
          const eased = progress * progress * (3 - 2 * progress);
          lottie?.goToAndStop(eased * end, true);
          // The name is centred and the mark sits at its left end: slide it to the centre as it folds.
          container.style.translate = `${(eased * markShift).toFixed(2)}% 0`;
        }
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

  return (
    <div
      ref={stage}
      {...stylex.props(styles.stage, fill && styles.fill)}
      onPointerEnter={() => {
        hovered.current = true;
      }}
      onPointerLeave={() => {
        hovered.current = false;
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
    visibility: "hidden",
    filter: colors.artworkFilter,
    pointerEvents: "none",
  },
  ready: { visibility: "visible" },
});
