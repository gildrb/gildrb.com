import * as stylex from "@stylexjs/stylex";
import type { InputHTMLAttributes } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { colors } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";
import {
  type Block,
  type Inline,
  type Run,
  armory,
  passages,
  runs,
  type Status,
} from "./heph-data.ts";

type Stage = { $: "Reading" } | { $: "Thinking" } | { $: "Writing"; shown: number } | { $: "Done" };

/** What the transcript shows for each line typed, below that line. */
type Entry =
  | { $: "Turn"; question: string; run: Run; stage: Stage }
  | { $: "Sources"; question: string; run: Run | null; only: string | null }
  | { $: "Help"; question: string }
  | { $: "Note"; question: string; text: string };

function opening(): Run {
  const [run] = runs;
  if (!run) throw new Error("The Heph demo needs at least one recorded run");
  return run;
}

// Replay pace. The figures each turn prints are the recorded ones.
const readAt = 300;
const thinkFor = 1400;
const charactersPerSecond = 700;

const stop = new Set([
  "how",
  "do",
  "does",
  "the",
  "a",
  "an",
  "is",
  "are",
  "my",
  "i",
  "to",
  "of",
  "in",
  "what",
  "which",
  "can",
  "and",
  "or",
  "it",
  "out",
  "own",
  "me",
  "heph",
]);

function words(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => !stop.has(word));
}

/** The recorded run that shares the most words with the question, if any. */
function closest(question: string): Run | null {
  const asked = new Set(words(question));
  let best: Run | null = null;
  let bestScore = 0;
  for (const run of runs) {
    const score = run.keywords.filter((word) => asked.has(word)).length;
    if (score > bestScore) {
      best = run;
      bestScore = score;
    }
  }
  return best;
}

function inlineLength(inline: Inline): number {
  return inline.$ === "Cite" ? inline.label.length : inline.text.length;
}

function blockLength(block: Block): number {
  return block.inlines.reduce((sum, inline) => sum + inlineLength(inline), 0);
}

function answerLength(run: Run): number {
  return run.answer.reduce((sum, block) => sum + blockLength(block), 0);
}

/** A raster image's `src` and `srcset`, from `sources()` in `markdown.tsx`, with its `sizes`. */
export type Wallpaper = { src: string; srcset?: string; sizes: string };

/** The window's place and size on the desktop, in pixels. */
type Rect = { x: number; y: number; w: number; h: number };
type Sides = { left: boolean; right: boolean; top: boolean; bottom: boolean };
type Hold =
  | { $: "Move"; dx: number; dy: number }
  | { $: "Resize"; sides: Sides; start: Rect; px: number; py: number };

// The window stops this far from the desktop's edges, and gets no smaller than this.
const inset = 10;
const smallest = { w: 320, h: 200 };

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

/** The rect moved and shrunk until it sits inside the desktop, `inset` from its edges. */
function within(rect: Rect, width: number, height: number): Rect {
  const w = Math.min(rect.w, width - 2 * inset);
  const h = Math.min(rect.h, height - 2 * inset);
  return {
    x: clamp(rect.x, inset, width - inset - w),
    y: clamp(rect.y, inset, height - inset - h),
    w,
    h,
  };
}

/** The rect a drag on some sides of the window makes from where it started. */
function resized(
  hold: Extract<Hold, { $: "Resize" }>,
  dx: number,
  dy: number,
  width: number,
  height: number,
): Rect {
  const { start, sides } = hold;
  const minW = Math.min(smallest.w, width - 2 * inset);
  const minH = Math.min(smallest.h, height - 2 * inset);
  let { x, y, w, h } = start;
  if (sides.left) {
    x = clamp(start.x + dx, inset, start.x + start.w - minW);
    w = start.x + start.w - x;
  }
  if (sides.right) w = clamp(start.w + dx, minW, width - inset - start.x);
  if (sides.top) {
    y = clamp(start.y + dy, inset, start.y + start.h - minH);
    h = start.y + start.h - y;
  }
  if (sides.bottom) h = clamp(start.h + dy, minH, height - inset - start.y);
  return { x, y, w, h };
}

const none: Sides = { left: false, right: false, top: false, bottom: false };
const handles = [
  ["n", { ...none, top: true }],
  ["e", { ...none, right: true }],
  ["s", { ...none, bottom: true }],
  ["w", { ...none, left: true }],
  ["nw", { ...none, top: true, left: true }],
  ["ne", { ...none, top: true, right: true }],
  ["se", { ...none, bottom: true, right: true }],
  ["sw", { ...none, bottom: true, left: true }],
] as const;

/**
 * Heph's command line, replaying answers that Heph gave from its own guide, in a window of
 * glass on a 4:3 desktop showing Velázquez's forge of Vulcan. The window moves by its title
 * bar and resizes by its edges and corners, and stops just short of the desktop's edges. The
 * green light or a double click on the title bar zooms it to fill the desktop. With `fill`, the
 * desktop fills the banner window of the case page; otherwise it keeps 4:3.
 */
export function Terminal({ fill, wallpaper }: { fill: boolean; wallpaper: Wallpaper }) {
  const desktop = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  // Where the reader moved or sized the window to; `null` keeps it centred at its own size.
  const [frame, setFrame] = useState<Rect | null>(null);
  const before = useRef<Rect | null>(null);
  const hold = useRef<Hold | null>(null);

  // A resized desktop (a turned phone, a resized browser) centres the window again.
  useEffect(() => {
    const target = desktop.current;
    if (!target) return undefined;
    const watch = new ResizeObserver(() => {
      before.current = null;
      setFrame(null);
    });
    watch.observe(target);
    return () => watch.disconnect();
  }, []);

  /** The window's rect now, and the desktop's place and size on the page. */
  function measure(): { rect: Rect; desk: DOMRect } | null {
    const pane = paneRef.current;
    const area = desktop.current;
    if (!pane || !area) return null;
    const box = pane.getBoundingClientRect();
    const desk = area.getBoundingClientRect();
    return {
      rect: { x: box.left - desk.left, y: box.top - desk.top, w: box.width, h: box.height },
      desk,
    };
  }

  function take(event: PointerEvent, next: (rect: Rect, desk: DOMRect) => Hold) {
    const now = measure();
    if (!now || event.button !== 0) return;
    hold.current = next(now.rect, now.desk);
    before.current = null;
    setFrame(now.rect);
    paneRef.current?.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  const grab = (event: PointerEvent) =>
    take(event, (rect, desk) => ({
      $: "Move",
      dx: event.clientX - desk.left - rect.x,
      dy: event.clientY - desk.top - rect.y,
    }));

  const stretch = (sides: Sides) => (event: PointerEvent) =>
    take(event, (start) => ({ $: "Resize", sides, start, px: event.clientX, py: event.clientY }));

  function move(event: PointerEvent) {
    const held = hold.current;
    const area = desktop.current;
    if (!held || !area) return;
    const desk = area.getBoundingClientRect();
    switch (held.$) {
      case "Move": {
        const x = Math.round(event.clientX - desk.left - held.dx);
        const y = Math.round(event.clientY - desk.top - held.dy);
        return setFrame((rect) => rect && within({ ...rect, x, y }, desk.width, desk.height));
      }
      case "Resize": {
        const next = resized(
          held,
          event.clientX - held.px,
          event.clientY - held.py,
          desk.width,
          desk.height,
        );
        return setFrame({
          x: Math.round(next.x),
          y: Math.round(next.y),
          w: Math.round(next.w),
          h: Math.round(next.h),
        });
      }
      default: {
        const _: never = held;
        return _;
      }
    }
  }

  function release() {
    hold.current = null;
  }

  /** Fills the desktop, or puts the window back where it was. */
  function zoom() {
    const now = measure();
    if (!now) return;
    const back = before.current;
    if (back) {
      before.current = null;
      return setFrame(back);
    }
    before.current = now.rect;
    setFrame({ x: inset, y: inset, w: now.desk.width - 2 * inset, h: now.desk.height - 2 * inset });
  }

  return (
    <div ref={desktop} {...stylex.props(styles.desktop, fill && styles.fill)}>
      <img
        {...stylex.props(styles.wallpaper)}
        src={wallpaper.src}
        srcset={wallpaper.srcset}
        sizes={wallpaper.sizes}
        alt=""
        decoding="async"
      />
      <div
        ref={paneRef}
        {...stylex.props(styles.pane, frame !== null && styles.placed)}
        style={
          frame === null
            ? undefined
            : {
                left: `${frame.x}px`,
                top: `${frame.y}px`,
                width: `${frame.w}px`,
                height: `${frame.h}px`,
              }
        }
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <Shell onGrab={grab} onZoom={zoom} />
        {handles.map(([name, sides]) => (
          <div
            {...stylex.props(styles.handle, styles[name])}
            aria-hidden="true"
            onPointerDown={stretch(sides)}
          />
        ))}
      </div>
    </div>
  );
}

/** Heph's window: a title bar, the transcript, the prompt and the status bar. */
function Shell({ onGrab, onZoom }: { onGrab: (event: PointerEvent) => void; onZoom: () => void }) {
  const first = opening();
  const [entries, setEntries] = useState<Entry[]>(
    runs
      .slice(0, 3)
      .map((run) => ({ $: "Turn", question: run.question, run, stage: { $: "Done" } })),
  );
  const [working, setWorking] = useState<{ label: string; since: number } | null>(null);
  const [now, setNow] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  // The slash-command menu: the selected row, and whether Esc closed it for this text.
  const [selected, setSelected] = useState(0);
  const [closed, setClosed] = useState(false);
  // Up and down walk through earlier questions when the menu is shut; `null` is the new line.
  const [recalled, setRecalled] = useState<number | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The newest line stays in view, as in a terminal.
  useLayoutEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [entries]);

  useEffect(() => {
    if (!working) return undefined;
    const clock = window.setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(clock);
  }, [working]);

  const lastRun = (): Run | null => {
    const turn = entries.findLast((entry) => entry.$ === "Turn");
    return turn?.$ === "Turn" ? turn.run : null;
  };

  /** The figures of the last finished answer, for the status bar, as Heph shows them. */
  const lastDone = (): Run | null => {
    const turn = entries.findLast((entry) => entry.$ === "Turn" && entry.stage.$ === "Done");
    return turn?.$ === "Turn" ? turn.run : null;
  };

  const showSources = (question: string, only: string | null = null) =>
    setEntries((current) => [...current, { $: "Sources", question, run: lastRun(), only }]);

  const setStage = (stage: Stage) =>
    setEntries((current) => {
      const last = current.at(-1);
      return last?.$ === "Turn" ? [...current.slice(0, -1), { ...last, stage }] : current;
    });

  const after = (delay: number, step: () => void) => {
    timers.current.push(window.setTimeout(step, delay));
  };

  function replay(question: string, run: Run) {
    const since = performance.now();
    setEntries((current) => [...current, { $: "Turn", question, run, stage: { $: "Reading" } }]);
    setWorking({ label: "Searching", since });
    after(readAt, () => {
      setStage({ $: "Thinking" });
      setWorking({ label: run.thought === null ? "Waiting for the model" : "Thinking", since });
    });
    const total = answerLength(run);
    after(readAt + thinkFor, () => {
      setWorking({ label: "Writing", since });
      const began = performance.now();
      const write = () => {
        const shown = Math.round(((performance.now() - began) / 1000) * charactersPerSecond);
        if (shown < total) {
          setStage({ $: "Writing", shown });
          after(16, write);
          return;
        }
        setStage({ $: "Done" });
        setWorking(null);
      };
      write();
    });
  }

  const matches = menuFor(text);
  const menu = matches.length > 0 && !closed;
  const asked = entries.flatMap((entry) => (entry.question ? [entry.question] : []));

  function type(value: string) {
    setText(value);
    setSelected(0);
    setClosed(false);
    setRecalled(null);
  }

  function enter(line: string) {
    if (working) return;
    const question = line.trim();
    if (!question) return;
    type("");
    if (question.startsWith("/")) return command(question);
    const found = closest(question);
    if (found) return replay(question, found);
    setEntries((current) => [
      ...current,
      {
        $: "Note",
        question,
        text: `This demo replays answers Heph gave from its guide. Try: ${runs.map((item) => item.question).join("  ")}`,
      },
    ]);
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const chosen = menu ? matches[selected] : undefined;
    enter(chosen ? `/${chosen}` : text);
  }

  function note(question: string, line: string) {
    setEntries((current) => [...current, { $: "Note", question, text: line }]);
  }

  function command(line: string) {
    const name = commandFor(line.slice(1).split(/\s/)[0] ?? "");
    switch (name) {
      case "new":
        return setEntries([]);
      case "sources":
        return showSources(line);
      case "help":
        return setEntries((current) => [...current, { $: "Help", question: line }]);
      case "model":
        return note(line, `${opening().model}  ${opening().level}  at ${armory.login}`);
      case "armory":
        return note(line, `${armory.name}  ${armory.files} files`);
      case "add":
      case "login":
      case "logout":
      case "exit":
        return note(line, `/${name} needs Heph on your computer; this demo only replays answers.`);
      case null:
        return note(line, `Unknown command ${line}. Type / to see the commands.`);
      default: {
        const _: never = name;
        return _;
      }
    }
  }

  function keys(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === "o") {
      event.preventDefault();
      return showSources("");
    }
    const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (menu) {
      if (step !== 0) {
        event.preventDefault();
        return setSelected((index) => (index + step + matches.length) % matches.length);
      }
      const chosen = matches[selected];
      if (event.key === "Tab" && chosen) {
        event.preventDefault();
        setText(`/${chosen} `);
        return setClosed(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        return setClosed(true);
      }
      return undefined;
    }
    if (step === 0 || asked.length === 0) return undefined;
    event.preventDefault();
    const index =
      recalled === null
        ? step < 0
          ? asked.length - 1
          : null
        : recalled + step >= asked.length
          ? null
          : Math.max(0, recalled + step);
    setRecalled(index);
    setText(index === null ? "" : (asked[index] ?? ""));
    return setClosed(true);
  }

  /** A click in the window focuses the field, unless the reader is selecting text. */
  function focus() {
    if (getSelection()?.isCollapsed !== false) input.current?.focus();
  }

  const done = lastDone();
  return (
    <div
      {...stylex.props(ui.mono, styles.shell)}
      aria-label="Heph, replaying recorded answers"
      role="group"
      onClick={focus}
    >
      <div {...stylex.props(ui.sans, styles.titlebar)} onPointerDown={onGrab} onDblClick={onZoom}>
        <Lights onZoom={onZoom} />
        <span {...stylex.props(styles.title)}>{`heph ${armory.name}`}</span>
      </div>
      <div ref={log} {...stylex.props(styles.log)} aria-live="polite">
        <div {...stylex.props(styles.transcript)}>
          {entries.map((entry) => (
            <EntryView entry={entry} onCite={(id) => showSources("", id)} />
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.bottom)}>
        {working ? (
          <WorkingLine label={working.label} seconds={Math.max(0, now - working.since) / 1000} />
        ) : (
          <div {...stylex.props(styles.blank)} />
        )}
        <form {...stylex.props(styles.prompt)} aria-label="Ask the Heph demo" onSubmit={submit}>
          <span {...stylex.props(styles.accent)} aria-hidden="true">
            {"❯ "}
          </span>
          <input
            ref={input}
            {...stylex.props(ui.reset, styles.input)}
            type="text"
            autoComplete="off"
            {...noSpellcheck}
            aria-label="Question"
            aria-expanded={menu}
            aria-controls="heph-commands"
            placeholder={`Ask about Heph, like: ${first.question}   / for commands`}
            value={text}
            onInput={(event) => type(event.currentTarget.value)}
            onKeyDown={keys}
          />
        </form>
        {menu ? (
          <Menu
            names={matches}
            selected={selected}
            onHover={setSelected}
            onPick={(name) => enter(`/${name}`)}
          />
        ) : (
          <div {...stylex.props(styles.status)} aria-hidden="true">
            <span {...stylex.props(styles.clip)}>
              {first.model} <span {...stylex.props(styles.accent)}>{first.level}</span>
              {done && gap + done.figures.join(gap)}
            </span>
            <span {...stylex.props(styles.optional)}>
              {`${armory.name}${gap}${armory.files} files`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Heph separates the fields of a line with spaces, no dots.
const gap = "   ";

// Preact types only know the lowercase `spellcheck`, which React Doctor rejects as a JSX
// attribute, so it is spread in to render the same `spellcheck="false"`.
const noSpellcheck = { spellcheck: false } satisfies InputHTMLAttributes;

function WorkingLine({ label, seconds }: { label: string; seconds: number }) {
  return (
    <p {...stylex.props(styles.line)}>
      <span {...stylex.props(styles.shine)}>{`${label}…`}</span>
      <span {...stylex.props(styles.dim)}>{`  ${Math.floor(seconds)}s`}</span>
    </p>
  );
}

const Blank = () => <div {...stylex.props(styles.blank)} />;

function EntryView({ entry, onCite }: { entry: Entry; onCite: (id: string) => void }) {
  return (
    <>
      {entry.question && (
        <>
          <p {...stylex.props(styles.line, styles.asked)}>
            <span {...stylex.props(styles.accent)}>{"❯ "}</span>
            {entry.question}
          </p>
          <Blank />
        </>
      )}
      <EntryBody entry={entry} onCite={onCite} />
      <Blank />
    </>
  );
}

function EntryBody({ entry, onCite }: { entry: Entry; onCite: (id: string) => void }) {
  switch (entry.$) {
    case "Turn":
      return <TurnView run={entry.run} stage={entry.stage} onCite={onCite} />;
    case "Sources":
      return <SourcesView run={entry.run} only={entry.only} />;
    case "Help":
      return (
        <>
          {help.map(([name, about]) => (
            <p {...stylex.props(styles.line)}>
              {name.padEnd(helpWidth)}
              <span {...stylex.props(styles.dim)}>{about}</span>
            </p>
          ))}
        </>
      );
    case "Note":
      return <p {...stylex.props(styles.line, styles.dim)}>{entry.text}</p>;
    default: {
      const _: never = entry;
      return _;
    }
  }
}

/** Heph's slash commands, in the order its menu lists them (`COMMANDS` in heph's prompt.py). */
const commands = {
  model: ["", "pick the model, add a local server, or log in"],
  armory: ["", "open or create an armory"],
  add: ["[path]", "copy a file or folder into this armory"],
  new: ["", "start a new chat"],
  sources: ["", "show the passages behind the last answer"],
  login: ["", "log in to OpenAI, OpenRouter, DeepSeek, Z.AI or ChatGPT"],
  logout: ["", "remove a login"],
  help: ["", "show commands and keys"],
  exit: ["", "quit"],
} as const satisfies Record<string, readonly [string, string]>;
type Command = keyof typeof commands;
const names = Object.keys(commands).filter((name): name is Command => name in commands);
const aliases: Record<string, Command> = { quit: "exit" };

// The keys this demo answers to, as Heph's /help words them.
const demoKeys: [string, string][] = [
  ["ctrl+o", "show the passages behind the last answer"],
  ["up, down", "earlier questions, or move in the menu"],
  ["tab", "complete the command"],
  ["esc", "close the menu"],
];
const help: [string, string][] = [
  ...names.map((name): [string, string] => [
    `/${name} ${commands[name][0]}`.trimEnd(),
    commands[name][1],
  ]),
  ["", ""],
  ...demoKeys,
];
const helpWidth = Math.max(...help.map(([name]) => name.length)) + 2;

/** How many characters of `name` the letters of `query` cover, in order; null if they don't fit. */
function span(query: string, name: string): number | null {
  const start = name.indexOf(query.charAt(0));
  if (start < 0) return null;
  let at = start;
  for (const char of query.slice(1)) {
    at = name.indexOf(char, at + 1);
    if (at < 0) return null;
  }
  return at - start + 1;
}

/** Edits between a and b: insert, delete, substitute, or swap two neighbours. */
function typos(a: string, b: string): number {
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i, ...Array.from({ length: b.length }, () => 0)];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, (before[j - 2] ?? 0) + 1);
      }
      current[j] = best;
    }
    before = previous;
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * The names `query` could mean, best first, as Heph's fuzzy.py ranks them: exact, prefix
 * (shorter first), letters in order (tighter first), then up to one typo per three letters.
 */
function rank<Name extends string>(query: string, candidates: readonly Name[]): Name[] {
  const wanted = query.toLowerCase();
  if (!wanted) return [...candidates];
  const scored: [tier: number, score: number, index: number][] = [];
  candidates.forEach((name, index) => {
    const candidate = name.toLowerCase();
    const fits = span(wanted, candidate);
    const edits = typos(wanted, candidate);
    if (candidate === wanted) scored.push([0, 0, index]);
    else if (candidate.startsWith(wanted)) scored.push([1, candidate.length, index]);
    else if (fits !== null) scored.push([2, fits, index]);
    else if (edits <= Math.max(1, Math.floor(wanted.length / 3))) scored.push([3, edits, index]);
  });
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return scored.flatMap(([, , index]) => candidates.slice(index, index + 1));
}

/** The commands the menu offers for a line: only while it is a `/` and a name, no space yet. */
function menuFor(line: string): Command[] {
  if (!line.startsWith("/") || /\s/.test(line)) return [];
  return rank(line.slice(1), names);
}

/** The command a typed name most likely means, as Heph runs it. */
function commandFor(name: string): Command | null {
  const [found] = rank(name, [...names, ...Object.keys(aliases)]);
  if (found === undefined) return null;
  return aliases[found] ?? names.find((candidate) => candidate === found) ?? null;
}

// Heph's menu shows ten rows at a time and follows the selection.
const menuRows = 10;

/** The slash-command menu, drawn as Heph draws it in place of the status bar. */
function Menu({
  names: shown,
  selected,
  onHover,
  onPick,
}: {
  names: Command[];
  selected: number;
  onHover: (index: number) => void;
  onPick: (name: Command) => void;
}) {
  const start = Math.min(
    Math.max(selected - Math.floor(menuRows / 2), 0),
    Math.max(shown.length - menuRows, 0),
  );
  const width = Math.max(...shown.map((name) => name.length));
  return (
    <div id="heph-commands" role="listbox" aria-label="Commands">
      {shown.slice(start, start + menuRows).map((name, row) => {
        const index = start + row;
        const current = index === selected;
        return (
          <p
            {...stylex.props(styles.line, styles.option, current && styles.accent)}
            role="option"
            aria-selected={current}
            onPointerMove={() => onHover(index)}
            onClick={() => onPick(name)}
          >
            {`${current ? "❯" : " "} ${name.padEnd(width)}  `}
            <span {...stylex.props(!current && styles.dim)}>{commands[name][1]}</span>
          </p>
        );
      })}
      {shown.length > menuRows && (
        <p {...stylex.props(styles.line, styles.dim)}>{`  (${selected + 1}/${shown.length})`}</p>
      )}
    </div>
  );
}

/**
 * The window's three lights, shaded as in macOS 26: each a small lens, darker at the top and
 * lighter at the bottom, with a glow low inside and a thin rim. Their glyphs show while the
 * pointer is over the group, and a pressed light swells. Green zooms the window.
 */
function Lights({ onZoom }: { onZoom: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      {...stylex.props(styles.lights)}
      onPointerEnter={() => setOver(true)}
      onPointerLeave={() => setOver(false)}
      onPointerDown={(event) => event.stopPropagation()}
      onDblClick={(event) => event.stopPropagation()}
    >
      {lights.map((light) => (
        <button
          type="button"
          tabIndex={-1}
          aria-label={light.label}
          {...stylex.props(ui.reset, styles.light, styles[light.tone])}
          onClick={light.tone === "green" ? onZoom : undefined}
        >
          <svg
            {...stylex.props(styles.glyph, over && styles.shown)}
            viewBox="0 0 13 13"
            fill="none"
            aria-hidden="true"
          >
            {light.glyph}
          </svg>
        </button>
      ))}
    </div>
  );
}

const lights = [
  {
    label: "Close",
    tone: "red",
    glyph: (
      <path
        d="M3.7 3.7l5.6 5.6M9.3 3.7l-5.6 5.6"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    ),
  },
  {
    label: "Minimize",
    tone: "yellow",
    glyph: <path d="M3.4 6.5h6.2" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />,
  },
  {
    label: "Zoom",
    tone: "green",
    glyph: (
      <g fill="currentColor">
        <path d="M3.6 3.6h5.2L3.6 8.8z" />
        <path d="M10.2 5v5.2H5z" />
      </g>
    ),
  },
] as const;

const marks: Record<Status, string> = { verified: "✓", unquoted: "?", failed: "✗", badid: "✗" };

function TurnView({
  run,
  stage,
  onCite,
}: {
  run: Run;
  stage: Stage;
  onCite: (id: string) => void;
}) {
  if (stage.$ === "Reading") return null;
  const writing = stage.$ === "Writing" || stage.$ === "Done";
  return (
    <>
      <p {...stylex.props(styles.line)}>
        <b {...stylex.props(styles.strong)}>Read </b>
        {`${run.read.count} passages${gap}`}
        {run.read.files.map((file, index) => (
          <span {...stylex.props(styles.accent)}>{(index ? "  " : "") + file}</span>
        ))}
        {run.read.more > 0 && (
          <span {...stylex.props(styles.dim)}>{`  +${run.read.more} more`}</span>
        )}
      </p>
      {writing && run.thought !== null && (
        <p {...stylex.props(styles.line)}>
          <b {...stylex.props(styles.strong)}>Thought </b>
          <span {...stylex.props(styles.dim)}>{`for ${run.thought.toFixed(1)}s`}</span>
        </p>
      )}
      {writing && (
        <>
          <Blank />
          <Answer
            blocks={run.answer}
            shown={stage.$ === "Writing" ? stage.shown : Infinity}
            onCite={onCite}
          />
          {stage.$ === "Writing" && <span {...stylex.props(styles.caret)} />}
        </>
      )}
      {stage.$ === "Done" && (
        <>
          <Blank />
          {run.sources.map((source) => (
            <p {...stylex.props(styles.line)}>
              <span {...stylex.props(styles[source.status])}>{`${marks[source.status]} `}</span>
              <b {...stylex.props(styles.strong)}>{source.id}</b>
              <span {...stylex.props(styles.accent)}>{`  ${source.file}`}</span>
              <span {...stylex.props(styles.dim)}>{gap + source.verdicts}</span>
            </p>
          ))}
        </>
      )}
    </>
  );
}

/** The answer's Markdown, cut at `shown` characters while it is being written. */
function Answer({
  blocks,
  shown,
  onCite,
}: {
  blocks: Block[];
  shown: number;
  onCite: (id: string) => void;
}) {
  let left = shown;
  const rendered = blocks.flatMap((block) => {
    if (left <= 0) return [];
    const checked = left >= blockLength(block);
    const parts = block.inlines.flatMap((inline) => {
      if (left <= 0) return [];
      const cut = Math.min(inlineLength(inline), left);
      left -= cut;
      return [<InlineView inline={inline} cut={cut} checked={checked} onCite={onCite} />];
    });
    return [
      <p {...stylex.props(styles.line, block.$ !== "Paragraph" && styles.item)}>
        {block.$ === "Bullet" && <span {...stylex.props(styles.accent)}>•</span>}
        {block.$ === "Number" && <span {...stylex.props(styles.accent)}>{`${block.n}.`}</span>}
        <span>{parts}</span>
      </p>,
    ];
  });
  return <div {...stylex.props(styles.answer)}>{rendered}</div>;
}

/** A citation shows its check once its block is complete, as Heph prints it; a click opens its passage. */
function InlineView({
  inline,
  cut,
  checked,
  onCite,
}: {
  inline: Inline;
  cut: number;
  checked: boolean;
  onCite: (id: string) => void;
}) {
  switch (inline.$) {
    case "Text":
      return <>{inline.text.slice(0, cut)}</>;
    case "Strong":
      return <b {...stylex.props(styles.strong)}>{inline.text.slice(0, cut)}</b>;
    case "Code":
      return <span {...stylex.props(styles.code)}>{inline.text.slice(0, cut)}</span>;
    case "Cite":
      if (!checked) return <>{inline.label.slice(0, cut)}</>;
      return (
        <button
          {...stylex.props(ui.reset, styles.cite, styles[inline.status])}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCite(inline.label.slice(1, -1));
          }}
        >
          {inline.label}
        </button>
      );
    default: {
      const _: never = inline;
      return _;
    }
  }
}

function SourcesView({ run, only }: { run: Run | null; only: string | null }) {
  if (!run)
    return <p {...stylex.props(styles.line, styles.dim)}>No passage matched the last question.</p>;
  const shown = run.evidence.filter((item) => only === null || only.split(", ").includes(item.id));
  return (
    <>
      {shown.map((item, index) => {
        const passage = passages[item.passage];
        if (!passage) throw new Error(`Unknown passage ${item.passage}`);
        return (
          <>
            {index > 0 && <Blank />}
            <p {...stylex.props(styles.line)}>
              <b {...stylex.props(styles.strong)}>{item.id}</b>
              <span {...stylex.props(styles.accent)}>{`  ${passage.file}`}</span>
              {item.cited > 0 && (
                <span {...stylex.props(styles.verified)}>
                  {`${gap}cited ${item.cited} ${item.cited === 1 ? "time" : "times"}`}
                </span>
              )}
            </p>
            <p {...stylex.props(styles.line, styles.dim, styles.passage)}>{passage.text}</p>
          </>
        );
      })}
    </>
  );
}

const small = "@container (max-width: 560px)";
// The case pages' banner window (see `styles.window` in markdown.tsx).
const banner = "@media (min-width: 1280px)";

const styles = stylex.create({
  desktop: {
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
  wallpaper: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    userSelect: "none",
    pointerEvents: "none",
  },
  // The window: centred by its margins until dragged, then where the reader left it. No
  // transform: a half-pixel translate over a backdrop filter blurs the text.
  pane: {
    position: "absolute",
    inset: 0,
    margin: "auto",
    width: { default: "min(72cqw, 760px)", [small]: "88cqw" },
    height: { default: "min(72cqh, 560px)", [small]: "82cqh" },
    touchAction: "none",
  },
  placed: { inset: "auto", margin: 0 },
  /*
   * Liquid glass: the wallpaper comes through, blurred and a little more saturated, under a
   * tint of the terminal colour. The rim is light caught on the edge of the glass, brightest at
   * the top, and a glare fades down from the top edge. The shadow is deep and soft.
   */
  shell: {
    position: "relative",
    width: "100%",
    height: "100%",
    minWidth: 0,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    gridTemplateColumns: "minmax(0, 1fr)",
    overflow: "hidden",
    borderRadius: "18px",
    backgroundColor: `color-mix(in oklch, ${colors.terminalBg} 62%, transparent)`,
    backdropFilter: "blur(36px) saturate(1.5)",
    boxShadow: [
      `inset 0 0 0 1px color-mix(in oklch, ${colors.primary} 22%, transparent)`,
      `inset 0 1px 0 color-mix(in oklch, ${colors.primary} 34%, transparent)`,
      "0 0 0 0.5px oklch(0% 0 0 / 0.35)",
      "0 2px 6px oklch(0% 0 0 / 0.18)",
      "0 40px 90px -20px oklch(0% 0 0 / 0.6)",
    ].join(", "),
    color: colors.article,
    fontSize: { default: "13px", [small]: "10px" },
    lineHeight: 1.35,
    WebkitTextSizeAdjust: "100%",
    "::before": {
      content: "",
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      pointerEvents: "none",
      backgroundImage: `linear-gradient(180deg, color-mix(in oklch, ${colors.primary} 14%, transparent), transparent 38%), radial-gradient(120% 60% at 0% 0%, color-mix(in oklch, ${colors.primary} 10%, transparent), transparent 60%)`,
    },
  },
  titlebar: {
    position: "relative",
    height: { default: "34px", [small]: "28px" },
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingLeft: { default: "14px", [small]: "10px" },
    cursor: "grab",
    userSelect: "none",
  },
  lights: {
    display: "flex",
    gap: { default: "9px", [small]: "7px" },
  },
  // Shading after the lights of macOS 26: a top-to-bottom gradient, a glow low inside, a thin
  // edge, and a darker rim on the sides only (the conic mask hides it at the top and bottom).
  light: {
    position: "relative",
    width: { default: "13px", [small]: "11px" },
    height: { default: "13px", [small]: "11px" },
    borderRadius: "50%",
    cursor: "default",
    transform: { default: "scale(1)", ":active": "scale(1.12)" },
    filter: { default: "brightness(1) saturate(1)", ":active": "brightness(1.2) saturate(1.1)" },
    transitionProperty: "transform, filter",
    transitionDuration: "0.3s",
    transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    "::after": {
      content: "",
      position: "absolute",
      inset: 0,
      borderRadius: "50%",
      maskImage:
        "conic-gradient(transparent 20deg, #000 90deg, transparent 160deg, transparent 200deg, #000 270deg, transparent 340deg)",
    },
  },
  red: {
    color: "#8a0000",
    backgroundImage:
      "radial-gradient(60% 46% at 50% 86%, #f5837c 0%, #f5837c 30%, transparent 100%), linear-gradient(to bottom, #f65449 0%, #f05c56 55%, #f16862 100%)",
    boxShadow:
      "inset 0 0 0 0.5px rgb(140 20 15 / 0.2), inset 0 0.75px 0 rgb(255 255 255 / 0.3), inset 0 -0.75px 0 rgb(255 255 255 / 0.16)",
    "::after": { boxShadow: "inset 0 0 0 0.75px rgb(175 20 15 / 0.7)" },
  },
  yellow: {
    color: "#a83000",
    backgroundImage:
      "radial-gradient(60% 46% at 50% 86%, #ffd95a 0%, #ffd95a 30%, transparent 100%), linear-gradient(to bottom, #fbb300 0%, #fbc000 55%, #fece32 100%)",
    boxShadow:
      "inset 0 0 0 0.5px rgb(150 95 0 / 0.2), inset 0 0.75px 0 rgb(255 255 255 / 0.3), inset 0 -0.75px 0 rgb(255 255 255 / 0.16)",
    "::after": { boxShadow: "inset 0 0 0 0.75px rgb(160 90 0 / 0.75)" },
  },
  green: {
    color: "#005300",
    backgroundImage:
      "radial-gradient(60% 46% at 50% 86%, #6fd95c 0%, #6fd95c 30%, transparent 100%), linear-gradient(to bottom, #00be00 0%, #33bf00 55%, #52c43c 100%)",
    boxShadow:
      "inset 0 0 0 0.5px rgb(0 90 0 / 0.2), inset 0 0.75px 0 rgb(255 255 255 / 0.3), inset 0 -0.75px 0 rgb(255 255 255 / 0.16)",
    "::after": { boxShadow: "inset 0 0 0 0.75px rgb(25 105 5 / 0.7)" },
  },
  glyph: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    transitionProperty: "opacity",
    transitionDuration: "0.1s",
  },
  shown: { opacity: 1 },
  // Invisible grips on the window's edges and corners, a little outside the glass.
  handle: { position: "absolute", zIndex: 1, touchAction: "none" },
  n: { top: "-4px", left: "14px", right: "14px", height: "8px", cursor: "ns-resize" },
  s: { bottom: "-4px", left: "14px", right: "14px", height: "8px", cursor: "ns-resize" },
  w: { left: "-4px", top: "14px", bottom: "14px", width: "8px", cursor: "ew-resize" },
  e: { right: "-4px", top: "14px", bottom: "14px", width: "8px", cursor: "ew-resize" },
  nw: { top: "-4px", left: "-4px", width: "18px", height: "18px", cursor: "nwse-resize" },
  ne: { top: "-4px", right: "-4px", width: "18px", height: "18px", cursor: "nesw-resize" },
  se: {
    bottom: "-4px",
    right: "-4px",
    width: "18px",
    height: "18px",
    cursor: "nwse-resize",
  },
  sw: {
    bottom: "-4px",
    left: "-4px",
    width: "18px",
    height: "18px",
    cursor: "nesw-resize",
  },
  option: { cursor: "default" },
  title: {
    fontSize: { default: "12px", [small]: "10px" },
    fontWeight: 500,
    color: colors.terminalMuted,
    whiteSpace: "pre",
  },
  // Short transcripts sit at the bottom, as in a terminal; long ones scroll.
  log: {
    position: "relative",
    minHeight: 0,
    paddingTop: 0,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overscrollBehavior: "contain",
    scrollbarWidth: "none",
    paddingInline: { default: "2ch", [small]: "1.5ch" },
  },
  bottom: {
    position: "relative",
    paddingInline: { default: "2ch", [small]: "1.5ch" },
    paddingBottom: "1lh",
  },
  transcript: { marginTop: "auto" },
  line: { margin: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word" },
  cite: {
    display: "inline",
    cursor: "pointer",
    textDecorationLine: { default: null, ":hover": "underline" },
    outline: { default: null, ":focus-visible": `1px solid ${colors.secondary}` },
  },
  blank: { height: "1lh" },
  asked: { color: colors.primary },
  answer: { paddingLeft: "1ch" },
  item: { display: "grid", gridTemplateColumns: "2ch minmax(0, 1fr)" },
  passage: { paddingLeft: "4ch" },
  strong: { color: colors.primary, fontWeight: 600 },
  accent: { color: colors.primary },
  dim: { color: colors.terminalMuted },
  code: { color: colors.secondary },
  // Working label: a shine sweeps through the text (after AICSS's Thinking State, MIT).
  shine: {
    color: "transparent",
    backgroundImage: `linear-gradient(90deg, ${colors.secondary} 0%, ${colors.secondary} 30%, ${colors.terminalMuted} 45%, ${colors.terminalMuted} 55%, ${colors.secondary} 70%, ${colors.secondary} 100%)`,
    backgroundSize: "300% 100%",
    backgroundClip: "text",
    animationName: stylex.keyframes({
      "0%, 18%": { backgroundPosition: "100% 0" },
      "82%, 100%": { backgroundPosition: "0% 0" },
    }),
    animationDuration: "2.25s",
    animationTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    animationIterationCount: "infinite",
  },
  // The block caret after the text being written (after AICSS's Streaming Text, MIT).
  caret: {
    display: "inline-block",
    width: "1ch",
    height: "1.05em",
    marginLeft: "1ch",
    verticalAlign: "text-bottom",
    backgroundColor: colors.primary,
  },
  verified: { color: colors.primary },
  unquoted: { color: colors.secondary },
  failed: { color: colors.terminalMuted, textDecorationLine: "line-through" },
  badid: { color: colors.terminalMuted, textDecorationLine: "line-through" },
  prompt: { display: "flex", whiteSpace: "pre", overflow: "hidden" },
  // Phones zoom into text fields under 16px: the field is set at 16px and scaled back down.
  input: {
    flex: 1,
    minWidth: 0,
    width: { default: null, [small]: "160%" },
    color: colors.primary,
    caretColor: colors.primary,
    lineHeight: "inherit",
    fontSize: { default: null, [small]: "16px" },
    transform: { default: null, [small]: "scale(0.625)" },
    transformOrigin: "left center",
    outline: "none",
    "::placeholder": { color: colors.terminalMuted, opacity: 1 },
  },
  status: {
    display: "flex",
    justifyContent: "space-between",
    gap: "2ch",
    color: colors.terminalMuted,
    whiteSpace: "pre",
  },
  clip: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" },
  optional: { display: { default: null, [small]: "none" } },
});
