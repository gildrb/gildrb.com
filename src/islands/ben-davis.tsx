import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "preact/hooks";
import { colors, media, space } from "../tokens.stylex.ts";

type Player = { goToAndStop(frame: number, isFrame: boolean): void; destroy(): void };
type Lottie = { loadAnimation(options: Record<string, unknown>): Player };
type Animation = { w: number };

function isLottie(value: unknown): value is Lottie {
  return (
    typeof value === "object" &&
    value !== null &&
    "loadAnimation" in value &&
    typeof value.loadAnimation === "function"
  );
}

function isAnimation(value: unknown): value is Animation {
  return typeof value === "object" && value !== null && "w" in value && typeof value.w === "number";
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
const restFor = 1.4;
const turnFor = 0.55;
// The file's last keyframe that moves anything; after it the file only holds the mark.
const foldEnd = 46.2;
// Samples per frame of where the drawing's centre sits, to keep it centred while it folds.
const samplesPerFrame = 2;
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
      const fold = lottie;
      const width = data.w;
      // Where the drawing's centre sits at each sample, in the file's units: the name is long and
      // the mark is short, so the centre moves as it folds.
      const centres: number[] = [];
      const group = container.querySelector("svg > g");
      const samples = Math.ceil(foldEnd * samplesPerFrame);
      for (let sample = 0; sample <= samples; sample += 1) {
        const at = Math.min(foldEnd, sample / samplesPerFrame);
        fold.goToAndStop(at, true);
        const box = group instanceof SVGGraphicsElement ? group.getBBox() : undefined;
        centres.push(box ? box.x + box.width / 2 : width / 2);
      }
      // Draws the fold at `progress`, 0 the name and 1 the mark, centred in the stage. Time runs
      // straight through the file, so its own easing shapes the motion.
      const draw = (progress: number) => {
        const at = progress * foldEnd;
        fold.goToAndStop(at, true);
        const index = Math.min(samples - 1, Math.floor(at * samplesPerFrame));
        const within = at * samplesPerFrame - index;
        const before = centres[index] ?? width / 2;
        const after = centres[index + 1] ?? before;
        const centre = before + (after - before) * within;
        const scale = container.clientWidth / width;
        container.style.translate = `${((width / 2 - centre) * scale).toFixed(2)}px 0`;
      };
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let progress = reduced ? 1 : 0;
      draw(progress);
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
          draw(progress);
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

const styles = stylex.create({
  stage: {
    position: "relative",
    width: "100%",
    minWidth: 0,
    aspectRatio: "4 / 3",
    overflow: "hidden",
    containerType: "size",
    backgroundColor: colors.bg,
    // The case pages' surface corner, as every banner (`styles.window` in markdown.tsx).
    borderRadius: space.radius,
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
  // Fills the case pages' banner window on desktop (`styles.window` in markdown.tsx).
  fill: { height: { default: null, [media.desktop]: "100%" } },
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
