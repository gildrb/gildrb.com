import * as stylex from "@stylexjs/stylex";
import type { TargetedMouseEvent } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { colors, media } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";
import {
  type EvidenceId,
  followUps,
  type Material,
  materials,
  overview,
  type Part,
} from "./heph-data.ts";

type Line =
  | { kind: "prompt"; text: string }
  | {
      kind: "line";
      tone: "plain" | "muted" | "summary" | "sources" | "response";
      parts: Part[];
      command?: boolean;
      /** Output of `/evidence`, replaced whenever another piece of evidence opens. */
      evidence?: boolean;
    };

const initial: Line[] = [
  { kind: "prompt", text: "What are these materials about?" },
  { kind: "line", tone: "summary", parts: ["armory: classics; materials: 4 enabled book files."] },
  { kind: "line", tone: "plain", parts: overview[0] ?? [] },
  {
    kind: "line",
    tone: "sources",
    parts: [`materials: ${materials.map(label).join("; ")}. Details: /evidence.`],
  },
];

function label(material: Material): string {
  return `${material.id} @${material.file}`;
}

function material(id: EvidenceId): Material {
  const found = materials.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown evidence ${id}`);
  return found;
}

const lastPick = new WeakMap<readonly unknown[], number>();

/** A random item that differs from the one picked from the same list last time. */
function pick<T>(items: readonly T[]): T {
  const previous = lastPick.get(items);
  let index = Math.floor(Math.random() * items.length);
  if (items.length > 1 && index === previous) index = (index + 1) % items.length;
  lastPick.set(items, index);
  const item = items[index];
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
}

const narrowFollowUps: ((item: Material) => Part[])[] = [
  (item) => [
    "The citation opens the file, page, and receipt behind this answer ",
    { evidenceId: item.id },
    ".",
  ],
  (item) => [
    "I am only using ",
    item.file,
    " because this answer is grounded there ",
    { evidenceId: item.id },
    ".",
  ],
  (item) => [
    "A comparison can bring in another book. This turn is grounded in ",
    item.file,
    " ",
    { evidenceId: item.id },
    ".",
  ],
];

function wantsSources(prompt: string): boolean {
  return (
    /^\/materials\b/i.test(prompt) ||
    /\b(evidence|source|sources|citation|citations|file|files)\b/i.test(prompt) ||
    /\b(which|list|show|open)\s+materials\b/i.test(prompt) ||
    /\bmaterials\s+(used|enabled|source|sources)\b/i.test(prompt)
  );
}

/** Scripts one answer: which materials the run "retrieves", and the cited reply. */
function answer(prompt: string): { retrieved: Material[]; reply: Part[][] } {
  const lower = prompt.toLowerCase();
  const topic = materials.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
  const shuffled = materials
    .map((item) => ({ item, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ item }) => item);
  if (wantsSources(prompt)) {
    return {
      retrieved: shuffled,
      reply: [
        [
          "Here is the source map for this turn: ",
          ...materials.flatMap((item, index): Part[] => [
            `${index === 3 ? ", and " : index ? ", " : ""}${item.id} is ${item.file} `,
            { evidenceId: item.id },
          ]),
          ". Click any citation to see the file, page, and a short receipt from the source.",
        ],
        pick(followUps),
      ],
    };
  }
  if (topic)
    return { retrieved: [topic], reply: [pick(topic.answers), pick(narrowFollowUps)(topic)] };
  return { retrieved: shuffled, reply: [pick(overview), pick(followUps)] };
}

/** The Heph terminal, simulated: scripted retrieval with inspectable citations. */
export function Terminal() {
  const [lines, setLines] = useState<Line[]>(initial);
  const [active, setActive] = useState<EvidenceId>("E1");
  const [running, setRunning] = useState(false);
  const [composer, setComposer] = useState({ empty: true, overflow: false });
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const run = useRef<{ id: number; timers: number[] }>({ id: 0, timers: [] });

  const append = (...added: Line[]) => setLines((current) => [...current, ...added]);

  function syncComposer() {
    const element = input.current;
    if (!element) return;
    const style = getComputedStyle(element);
    const padding = Number.parseFloat(style.paddingLeft) || 0;
    const characterWidth = padding || (Number.parseFloat(style.fontSize) || 1) * 0.6;
    const visible = Math.max(
      0,
      element.clientWidth - padding - (Number.parseFloat(style.paddingRight) || 0),
    );
    const scroll = Math.max(
      0,
      (element.selectionStart ?? element.value.length) * characterWidth - visible,
    );
    element.scrollLeft = scroll;
    setComposer({ empty: !element.value, overflow: scroll > 0 });
  }

  function clearInput() {
    if (!input.current) return;
    input.current.value = "";
    syncComposer();
  }

  function cancelRun(): number {
    run.current.timers.forEach(clearTimeout);
    run.current = { id: run.current.id + 1, timers: [] };
    return run.current.id;
  }

  function at(id: number, delay: number, step: () => void) {
    run.current.timers.push(window.setTimeout(() => id === run.current.id && step(), delay));
  }

  function openEvidence(id: EvidenceId, command = true) {
    setActive(id);
    const opened: Line[] = [
      { kind: "line", tone: "response", evidence: true, parts: [`OPEN @${material(id).file}`] },
      { kind: "line", tone: "response", evidence: true, parts: [material(id).detail] },
    ];
    if (command) {
      opened.unshift({
        kind: "line",
        tone: "muted",
        command: true,
        evidence: true,
        parts: [`/evidence ${id} open`],
      });
    }
    setLines((current) => [
      ...current.filter((line) => line.kind === "prompt" || !line.evidence),
      ...opened,
    ]);
    clearInput();
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const prompt = input.current?.value.trim() ?? "";
    if (running) return;
    if (!prompt) return input.current?.focus();
    const id = cancelRun();
    append({ kind: "prompt", text: prompt });
    if (/^\/evidence\b/i.test(prompt)) {
      const requested = prompt.match(/^\/evidence\s+(E[1-4])\b/i)?.[1]?.toUpperCase();
      return openEvidence(materials.find((item) => item.id === requested)?.id ?? active, false);
    }
    const { retrieved, reply } = answer(prompt);
    clearInput();
    setRunning(true);
    const steps: { text: string; evidence?: EvidenceId }[] = [
      { text: "Reading enabled materials from classics." },
      { text: "Index current: 4 sources." },
      { text: "Retrieving evidence for the question." },
      ...retrieved.map((item) => ({
        evidence: item.id,
        text: `Retrieved ${item.id} from materials/${item.file}: ${item.excerpt}`,
      })),
      { text: `Mapped ${retrieved.length} evidence receipts for /evidence.` },
      { text: "Writing cited answer." },
      { text: "Saved evidence for /evidence." },
      { text: "Answer ready." },
    ];
    steps.forEach((step, index) =>
      at(id, 140 + index * 150, () => {
        if (step.evidence) setActive(step.evidence);
        append({ kind: "line", tone: "muted", parts: [step.text] });
      }),
    );
    const replyAt = 140 + steps.length * 150 + 120;
    reply.forEach((parts, index) =>
      at(id, replyAt + index * 170, () => append({ kind: "line", tone: "response", parts })),
    );
    const done = replyAt + reply.length * 170;
    at(id, done, () =>
      append({
        kind: "line",
        tone: "sources",
        parts: [`materials: ${retrieved.map(label).join("; ")}. Details: /evidence`],
      }),
    );
    at(id, done + 50, () => {
      setRunning(false);
      clearInput();
    });
  }

  // Keep the newest output in view by translating the rail, snapping so that the top edge
  // never cuts through a line of text.
  function scrollToEnd() {
    const logElement = log.current;
    const railElement = rail.current;
    if (!logElement || !railElement) return;
    const lineHeight = Number.parseFloat(getComputedStyle(railElement).lineHeight);
    const raw = Math.max(0, railElement.scrollHeight - logElement.clientHeight);
    let offset = raw;
    if (lineHeight > 0) {
      const top = railElement.getBoundingClientRect().top;
      let clipped = raw;
      for (const child of railElement.children) {
        if (!(child instanceof HTMLElement) || child.offsetTop + child.offsetHeight < raw) continue;
        if (child.offsetTop > raw + lineHeight) break;
        const range = document.createRange();
        range.selectNodeContents(child);
        for (const rect of range.getClientRects()) {
          if (rect.top - top < raw + 1 && rect.bottom - top > raw + 1)
            clipped = Math.max(clipped, rect.bottom - top);
        }
      }
      if (clipped > raw) offset = Math.min(raw + lineHeight, clipped);
    }
    logElement.scrollTop = 0;
    railElement.style.setProperty("--offset", `${-offset}px`);
  }

  useLayoutEffect(scrollToEnd, [lines]);

  useEffect(() => {
    const observer = new ResizeObserver(scrollToEnd);
    for (const element of [log.current, rail.current]) if (element) observer.observe(element);
    void document.fonts.ready.then(scrollToEnd);
    let frame = 0;
    const resize = () => {
      scrollToEnd();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncComposer);
    };
    addEventListener("resize", resize);
    syncComposer();
    return () => {
      observer.disconnect();
      removeEventListener("resize", resize);
      run.current.timers.forEach(clearTimeout);
    };
  }, []);

  const queueSync = () => requestAnimationFrame(syncComposer);
  const evidenceHandlers = (id: EvidenceId) => ({
    tabIndex: -1,
    type: "button" as const,
    onPointerEnter: () => setActive(id),
    onFocus: () => setActive(id),
    onClick: (event: TargetedMouseEvent<HTMLButtonElement>) => {
      openEvidence(id);
      if (event.detail > 0) event.currentTarget.blur();
    },
  });

  return (
    <div {...stylex.props(styles.demo)}>
      <div {...stylex.props(styles.frame)}>
        <a {...stylex.props(styles.close)} href="/" aria-label="Return to the portfolio" />
        <div {...stylex.props(ui.mono, styles.shell)} aria-hidden="true">
          <div {...stylex.props(styles.titlebar)}>
            <span {...stylex.props(styles.controls)}>
              {(["red", "yellow", "green"] as const).map((control) => (
                <span {...stylex.props(styles.control, styles[control])} />
              ))}
            </span>
          </div>
          <div {...stylex.props(styles.terminal)}>
            <div {...stylex.props(styles.status)}>
              <strong {...stylex.props(styles.statusItem, styles.brand)}>Heph</strong>
              <span {...stylex.props(styles.statusItem)}>
                ARMORY <b {...stylex.props(styles.key)}>classics</b>
              </span>
              <span {...stylex.props(styles.statusItem)}>
                MODEL <b {...stylex.props(styles.key)}>gpt-5.5</b>
              </span>
              <span {...stylex.props(styles.statusItem, styles.optional)}>
                REASONING <b {...stylex.props(styles.key)}>low</b>
              </span>
            </div>
            <div {...stylex.props(styles.transcript)}>
              <div ref={log} {...stylex.props(styles.output)} aria-live="polite">
                <div ref={rail} {...stylex.props(styles.rail)}>
                  {lines.map((line, index) =>
                    line.kind === "prompt" ? (
                      <div
                        {...stylex.props(
                          styles.row,
                          styles.prompt,
                          lines[index - 1]?.kind === "line" && styles.afterLine,
                        )}
                      >
                        {line.text}
                      </div>
                    ) : (
                      <p {...stylex.props(styles.line, styles[line.tone])}>
                        {line.command && (
                          <>
                            <span {...stylex.props(ui.sans)}>→</span>{" "}
                          </>
                        )}
                        {line.parts.map((part) =>
                          typeof part === "string" ? (
                            part
                          ) : (
                            <button
                              {...stylex.props(ui.reset, styles.citation)}
                              {...evidenceHandlers(part.evidenceId)}
                            >
                              [{part.evidenceId}]
                            </button>
                          ),
                        )}
                      </p>
                    ),
                  )}
                </div>
              </div>
            </div>
            <aside
              {...stylex.props(styles.evidence)}
              aria-label="Demo scope and evidence materials"
            >
              <p {...stylex.props(styles.ellipsis, styles.evidenceOpen)}>
                EVIDENCE <b {...stylex.props(styles.key)}>ctrl+g</b>
              </p>
              <p {...stylex.props(styles.ellipsis, styles.scope)}>
                SCOPE <b {...stylex.props(styles.key)}>4/4</b>
              </p>
              <p {...stylex.props(styles.ellipsis, styles.meta)}>
                EXCERPTS <b {...stylex.props(styles.key)}>4</b>
              </p>
              <div {...stylex.props(styles.evidenceList)}>
                {materials.map((item) => (
                  <button
                    {...stylex.props(ui.reset, styles.ellipsis, styles.evidenceItem)}
                    {...evidenceHandlers(item.id)}
                  >
                    @{item.file}
                  </button>
                ))}
              </div>
            </aside>
            <form
              {...stylex.props(styles.row, styles.composer)}
              aria-label="Ask the simulated Heph demo"
              onSubmit={submit}
            >
              <span {...stylex.props(styles.composerLabel)} aria-hidden="true">
                <span {...stylex.props(ui.sans)}>→</span>
              </span>
              <span
                {...stylex.props(styles.cursor, composer.empty && !running && styles.blinking)}
                aria-hidden="true"
              />
              <span
                {...stylex.props(styles.overflow, composer.overflow && styles.overflowShown)}
                aria-hidden="true"
              >
                ...
              </span>
              <input
                ref={input}
                {...stylex.props(ui.reset, styles.input, composer.empty && styles.caretHidden)}
                type="text"
                autocomplete="off"
                spellcheck={false}
                tabIndex={-1}
                placeholder="Ask Heph about these materials"
                readOnly={running}
                onInput={queueSync}
                onScroll={syncComposer}
                onClick={queueSync}
                onFocus={queueSync}
                onKeyUp={queueSync}
                onPointerUp={queueSync}
                onSelect={queueSync}
              />
              <button
                {...stylex.props(ui.reset, styles.submit)}
                type="submit"
                tabIndex={-1}
                aria-label="Submit Heph prompt"
                disabled={running}
                onClick={(event) => event.detail > 0 && event.currentTarget.blur()}
              >
                <span {...stylex.props(ui.sans, styles.submitSymbol)} aria-hidden="true">
                  ↩
                </span>
              </button>
            </form>
            <div {...stylex.props(styles.commands)} aria-hidden="true">
              {running ? (
                <>
                  <span>
                    STOP <b {...stylex.props(styles.key)}>esc</b>
                  </span>
                  <span {...stylex.props(styles.command)}>
                    EXIT <b {...stylex.props(styles.key)}>ctrl+c</b>
                  </span>
                </>
              ) : (
                <>
                  <span>
                    ARMORY <b {...stylex.props(styles.key)}>ctrl+a</b>
                  </span>
                  <span {...stylex.props(styles.command)}>
                    MATERIALS <b {...stylex.props(styles.key)}>ctrl+o</b>
                  </span>
                  <span {...stylex.props(styles.command, styles.optional)}>
                    COMMANDS <b {...stylex.props(styles.key)}>ctrl+p</b>
                  </span>
                  <span {...stylex.props(styles.command, styles.optional)}>
                    REASONING <b {...stylex.props(styles.key)}>shift+tab</b>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ranges never overlap: StyleX does not order overlapping queries.
const wide = "@container (min-width: 900px)";
const compact = "@container (max-width: 700px)";
const medium = "@container (min-width: 561px) and (max-width: 700px)";
const small = "@container (max-width: 560px)";
const tiny = "@container (max-width: 460px)";
const phoneFrame = "@media (min-width: 461px) and (max-width: 700px)";
const smallPhoneFrame = "@media (max-width: 460px)";

const styles = stylex.create({
  demo: { width: "100%", minWidth: 0, containerType: "inline-size" },
  frame: {
    position: "relative",
    width: "100%",
    minWidth: 0,
    padding: { default: null, [phoneFrame]: "34px 14px", [smallPhoneFrame]: "32px 12px" },
    borderRadius: { default: "13px", [phoneFrame]: "24px", [smallPhoneFrame]: "22px" },
    backgroundColor: { default: null, "@media (max-width: 700px)": colors.terminalFrameBg },
  },
  close: {
    position: "absolute",
    zIndex: 3,
    top: { default: "4px", [phoneFrame]: "38px", [smallPhoneFrame]: "36px" },
    left: { default: "4px", [phoneFrame]: "18px", [smallPhoneFrame]: "16px" },
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    outline: { default: null, ":focus-visible": "0" },
    boxShadow: { default: null, ":focus-visible": `0 0 0 2px ${colors.primary}` },
  },
  shell: {
    width: "100%",
    minWidth: 0,
    height: {
      default: "clamp(460px, 64cqw, 720px)",
      [wide]: "720px",
      [medium]: "460px",
      [small]: "430px",
      "@supports not (height: 1cqw)": "auto",
    },
    aspectRatio: { default: null, "@supports not (height: 1cqw)": "16 / 9" },
    minHeight: { default: null, "@supports not (height: 1cqw)": "360px" },
    margin: { default: null, [small]: "0 auto" },
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    overflow: "hidden",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "oklch(100% 0 0 / 0.14)",
    borderRadius: { default: "13px", [small]: "15px" },
    backgroundColor: colors.terminalBg,
    backgroundClip: "padding-box",
    color: colors.secondary,
    fontSize: { default: "14px", [small]: "10px" },
    lineHeight: 1.35,
    WebkitTextSizeAdjust: "100%",
  },
  titlebar: {
    height: { default: "32px", [small]: "28px" },
    display: "grid",
    gridTemplateColumns: {
      default: "64px minmax(0, 1fr) 64px",
      [small]: "48px minmax(0, 1fr) 48px",
    },
    alignItems: "center",
    padding: { default: "0 10px", [small]: "0 8px" },
    lineHeight: 1,
    userSelect: "none",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: { default: "8px", [small]: "6px" },
    transform: "translate(-2px, -2px)",
  },
  control: {
    position: "relative",
    width: { default: "14px", [small]: "11px" },
    height: { default: "14px", [small]: "11px" },
    borderRadius: "50%",
    isolation: "isolate",
    "::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "oklch(0% 0 0 / 0.28)",
      borderRadius: "inherit",
      mixBlendMode: "overlay",
      pointerEvents: "none",
    },
  },
  red: { backgroundColor: "oklch(69.52% 0.181 23.77)", transform: "translateX(-1px)" },
  yellow: { backgroundColor: "oklch(86.53% 0.1667 91.98)" },
  green: { backgroundColor: "oklch(72.72% 0.1864 147.73)", transform: "translateX(1px)" },
  terminal: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr) 23ch", [small]: "minmax(0, 1fr)" },
    gridTemplateRows: "auto minmax(0, 1fr) auto auto",
    columnGap: { default: "2ch", [medium]: "1.5ch", [small]: 0 },
    overflow: "hidden",
  },
  status: {
    minWidth: 0,
    height: { default: null, [small]: "2lh" },
    display: "flex",
    alignItems: { default: "center", [small]: "flex-start" },
    gridColumn: 1,
    gridRow: 1,
    gap: { default: "2ch", [compact]: "1.5ch" },
    padding: { default: "0 0 1lh", [small]: 0 },
    whiteSpace: "nowrap",
    color: colors.terminalMuted,
    overflow: "hidden",
  },
  statusItem: {
    minWidth: 0,
    flex: { default: null, [small]: "none" },
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  brand: { color: colors.primary, fontWeight: 600 },
  key: { color: colors.secondary, fontWeight: 400 },
  optional: { display: { default: null, [compact]: "none" } },
  transcript: {
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gridColumn: 1,
    gridRow: 2,
    overflow: "hidden",
  },
  output: { minWidth: 0, minHeight: 0, flex: 1, overflow: "hidden" },
  rail: { minWidth: 0, flex: "none", transform: "translateY(var(--offset, 0px))" },
  row: {
    width: "100%",
    minWidth: 0,
    height: "3lh",
    minHeight: "3lh",
    display: "flex",
    alignItems: "center",
    backgroundColor: colors.terminalRowBg,
  },
  prompt: {
    marginBottom: "1lh",
    padding: { default: "0 2ch", [tiny]: "0 1.5ch" },
    color: colors.primary,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  afterLine: { marginTop: "1lh" },
  line: {
    flex: "none",
    marginBottom: { default: "1lh", [small]: "0.75lh" },
    paddingInline: "2ch",
    color: colors.primary,
    overflowWrap: "break-word",
  },
  plain: {},
  muted: { marginBottom: 0, paddingLeft: "4ch", color: colors.terminalMuted },
  summary: { paddingLeft: "4ch", color: colors.terminalMuted },
  sources: {
    marginTop: { default: null, [small]: "1lh" },
    marginBottom: 0,
    color: colors.terminalMuted,
    fontStyle: "italic",
  },
  response: { marginTop: "1lh" },
  citation: {
    display: "inline",
    color: { default: colors.secondary, ":hover": { [media.hover]: colors.primary } },
    outline: { default: null, ":focus-visible": `1px solid ${colors.secondary}` },
    outlineOffset: "3px",
  },
  evidence: {
    width: "100%",
    minWidth: 0,
    display: { default: "grid", [small]: "none" },
    gridTemplateRows: "auto 1lh auto 1lh auto auto minmax(0, 1fr)",
    alignContent: "start",
    gridColumn: 2,
    gridRow: "1 / 3",
    paddingRight: "2ch",
    overflow: "hidden",
    color: colors.terminalMuted,
  },
  ellipsis: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  evidenceOpen: { gridRow: 1, height: "1lh" },
  scope: { gridRow: 3 },
  meta: { gridRow: 5 },
  evidenceList: {
    gridRow: 6,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    overflow: "hidden",
  },
  evidenceItem: {
    display: "block",
    width: "100%",
    height: "1lh",
    minWidth: 0,
    color: { default: colors.secondary, ":hover": { [media.hover]: colors.primary } },
    outline: { default: null, ":focus-visible": `1px solid ${colors.secondary}` },
    outlineOffset: "3px",
  },
  composer: { position: "relative", gridColumn: "1 / -1", gridRow: 3, marginTop: "1lh" },
  composerLabel: {
    flex: "none",
    width: "1ch",
    height: "1lh",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.secondary,
  },
  cursor: {
    position: "absolute",
    top: "50%",
    left: "1ch",
    width: "1ch",
    height: "1lh",
    opacity: 0,
    backgroundColor: colors.secondary,
    pointerEvents: "none",
    transform: "translateY(-50%)",
  },
  blinking: {
    animationName: stylex.keyframes({ "0%, 49%": { opacity: 0.9 }, "50%, 100%": { opacity: 0 } }),
    animationDuration: "1s",
    animationTimingFunction: "steps(1, end)",
    animationIterationCount: "infinite",
  },
  overflow: {
    position: "absolute",
    zIndex: 1,
    top: "50%",
    left: "1ch",
    width: "3ch",
    height: "1lh",
    display: "none",
    backgroundColor: "inherit",
    color: colors.terminalMuted,
    lineHeight: "inherit",
    pointerEvents: "none",
    transform: "translateY(-50%)",
    userSelect: "none",
  },
  overflowShown: { display: "block" },
  input: {
    width: { default: "100%", [small]: "160%" },
    minWidth: 0,
    height: "1lh",
    padding: "0 5ch 0 1ch",
    color: colors.primary,
    caretColor: colors.primary,
    lineHeight: "inherit",
    cursor: "text",
    fontSize: { default: null, [small]: "16px" },
    transform: { default: null, [small]: "scale(0.625)" },
    transformOrigin: "left center",
    outline: "none",
    "::placeholder": { color: colors.terminalMuted, opacity: 1 },
  },
  caretHidden: { caretColor: "transparent" },
  submit: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "5ch",
    height: "3lh",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 2ch 0 1ch",
    color: {
      default: colors.terminalMuted,
      ":hover": { [media.hover]: colors.secondary },
      ":disabled": colors.terminalMuted,
    },
    lineHeight: "inherit",
    userSelect: "none",
    opacity: { default: null, ":disabled": 0.5 },
    cursor: { default: "pointer", ":disabled": "default" },
    outline: { default: null, ":focus-visible": `1px solid ${colors.secondary}` },
    outlineOffset: "-1px",
  },
  submitSymbol: { lineHeight: 1 },
  commands: {
    minWidth: 0,
    height: "1lh",
    display: "flex",
    gridColumn: "1 / -1",
    gridRow: 4,
    alignItems: "center",
    paddingRight: "2ch",
    color: colors.terminalMuted,
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  command: { marginLeft: "2ch" },
});
