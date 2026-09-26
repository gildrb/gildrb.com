import * as stylex from "@stylexjs/stylex";
import type { TargetedEvent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { colors, media, space } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";

/**
 * Archetypon in the browser. The engine is the tool's own web build, copied unchanged into
 * `public/tools/archetypon/`: a module worker that runs `archetypon.wasm` on the files it is
 * sent. Nothing leaves the device.
 */
const engine = "/tools/archetypon/worker.js";

const formats = ["svg", "pdf", "png", "webp", "jpeg", "ico"] as const;
type Format = (typeof formats)[number];
const labels: Record<Format, string> = {
  svg: "SVG",
  pdf: "PDF",
  png: "PNG",
  webp: "WebP",
  jpeg: "JPEG",
  ico: "ICO",
};
const raster: readonly Format[] = ["png", "webp", "jpeg"];

/** The engine's exit code for an SVG with text but no fonts to set it in. */
const noFonts = 2;
/** The raster sizes on offer, in pixels; all picked to start with. */
const sizeOptions = [16, 32, 48, 64, 128, 256, 512, 1024, 2048, 4096] as const;
/** What "Opaque" fills behind the artwork. */
const opaque = "#ffffff";

/** One toggle: a format, or a size. Its `data-toggle` reads `group:value`. */
type Key = { group: "format"; value: Format } | { group: "size"; value: number };

function keyOf(text: string | undefined): Key | null {
  const [group, value] = text?.split(":") ?? [];
  if (group === "format" && isFormat(value)) return { group, value };
  const size = sizeOptions.find((option) => String(option) === value);
  return group === "size" && size !== undefined ? { group, value: size } : null;
}

type Step = "pending" | "running" | "done";
type Output = { path: string; size: number };
type Result = {
  name: string;
  preview: string | null;
  size: string | null;
  steps: { format: Format; state: Step }[];
  files: Output[];
  error: string | null;
};
type Font = { text: string; error: boolean };
type Status = { text: string; error: boolean };
type Download = { url: string; name: string; bytes: number };

type Message =
  | { type: "font"; name: string; families: string[] }
  | { type: "font-error"; name: string; message: string }
  | { type: "open"; index: number; width: number; height: number }
  | { type: "step"; index: number; format: Format }
  | { type: "stepped"; index: number; format: Format; files: Output[] }
  | { type: "converted"; index: number }
  | { type: "failed"; index: number; code: number; message: string }
  | { type: "done"; zip: ArrayBuffer | null; ms: number }
  | { type: "error"; message: string };

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isFormat = (value: unknown): value is Format =>
  typeof value === "string" && (formats as readonly string[]).includes(value);
const isIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const isOutput = (value: unknown): value is Output =>
  isObject(value) &&
  "path" in value &&
  typeof value.path === "string" &&
  "size" in value &&
  typeof value.size === "number";
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Checks a worker message against the engine's protocol (`worker.js`). */
function decode(value: unknown): Message | null {
  if (!isObject(value)) return null;
  const data: Record<string, unknown> = Object.fromEntries(Object.entries(value));
  const { type, index, name, message, format } = data;
  switch (type) {
    case "font":
      return typeof name === "string" && isStrings(data.families)
        ? { type, name, families: data.families }
        : null;
    case "font-error":
      return typeof name === "string" && typeof message === "string"
        ? { type, name, message }
        : null;
    case "open": {
      const { width, height } = data;
      return isIndex(index) && typeof width === "number" && typeof height === "number"
        ? { type, index, width, height }
        : null;
    }
    case "step":
      return isIndex(index) && isFormat(format) ? { type, index, format } : null;
    case "stepped": {
      const { files } = data;
      return isIndex(index) && isFormat(format) && Array.isArray(files) && files.every(isOutput)
        ? { type, index, format, files }
        : null;
    }
    case "converted":
      return isIndex(index) ? { type, index } : null;
    case "failed": {
      const { code } = data;
      return isIndex(index) && typeof code === "number" && typeof message === "string"
        ? { type, index, code, message }
        : null;
    }
    case "done": {
      const { zip, ms } = data;
      return (zip === null || zip instanceof ArrayBuffer) && typeof ms === "number"
        ? { type, zip, ms }
        : null;
    }
    case "error":
      return typeof message === "string" ? { type, message } : null;
    default:
      return null;
  }
}

function kind(name: string): "svg" | "font" | null {
  if (/\.svgz?$/i.test(name)) return "svg";
  if (/\.(ttf|otf|ttc)$/i.test(name)) return "font";
  return null;
}

const stem = (name: string) => name.replace(/\.svgz?$/i, "");
const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const digits = (value: number) => value.toFixed(value < 10 ? 1 : 0);
  let value = bytes / 1000;
  for (const unit of ["kB", "MB"] as const) {
    if (value < 1000) return `${digits(value)} ${unit}`;
    value /= 1000;
  }
  return `${digits(value)} GB`;
}

/** Replaces a file of the same name, so dropping an edited file again updates it. */
function upsert(list: readonly File[], file: File): File[] {
  return [...list.filter((item) => item.name !== file.name), file];
}

/** A data URL, which the site's image policy allows (it does not allow `blob:`). */
async function preview(file: File): Promise<string> {
  const svg = /\.svgz$/i.test(file.name)
    ? await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).blob()
    : file;
  const bytes = new Uint8Array(await svg.arrayBuffer());
  let binary = "";
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

type Options = { formats: Format[]; config: string } | { errors: string[] };

function readOptions(
  selected: ReadonlySet<Format>,
  sizes: ReadonlySet<number>,
  filled: boolean,
  quality: string,
): Options {
  const chosen = formats.filter((format) => selected.has(format));
  const errors: string[] = [];
  if (sizes.size === 0 && chosen.some((f) => raster.includes(f))) {
    errors.push("PNG, WebP and JPEG need at least one size.");
  }
  if (chosen.includes("jpeg") && (quality === "" || Number(quality) < 1)) {
    errors.push("JPEG quality runs from 1% to 100%.");
  }
  if (chosen.length === 0) errors.push("Pick at least one format.");
  if (errors.length > 0) return { errors };
  const picked = sizeOptions.filter((size) => sizes.has(size));
  const config = `sizes=${picked.join(",")}\nbackground=${filled ? opaque : ""}\njpeg-quality=${quality || "100"}\n`;
  return { formats: chosen, config };
}

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") === true;

/** A whole number up to 100, or nothing while it is being typed. */
const cleanQuality = (text: string) => {
  const digits = text.replace(/\D/g, "").slice(0, 3);
  return digits === "" ? "" : String(Math.min(Number(digits), 100));
};

export function Converter() {
  const [svgs, setSvgs] = useState<File[]>([]);
  const [fonts, setFonts] = useState<File[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<Format>>(() => new Set(formats));
  const [sizes, setSizes] = useState<ReadonlySet<number>>(() => new Set(sizeOptions));
  const [filled, setFilled] = useState(false);
  const [quality, setQuality] = useState("100");
  const [results, setResults] = useState<Result[]>([]);
  const [fontList, setFontList] = useState<Font[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [download, setDownload] = useState<Download | null>(null);
  const [dragging, setDragging] = useState(false);
  const worker = useRef<Worker | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  // Stop the engine and free the ZIP when the page goes away.
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => () => void (download && URL.revokeObjectURL(download.url)), [download]);

  function stop() {
    worker.current?.terminate();
    worker.current = null;
  }

  function convert(files: readonly File[], fontFiles: readonly File[], note = "") {
    if (files.length === 0) return;
    const options = readOptions(selected, sizes, filled, quality);
    if ("errors" in options) {
      setStatus({ text: options.errors.join(" "), error: true });
      return;
    }
    stop();
    setDownload(null);
    setFontList([]);
    setResults(
      files.map((file) => ({
        name: file.name,
        preview: null,
        size: null,
        steps: options.formats.map((format) => ({ format, state: "pending" as const })),
        files: [],
        error: null,
      })),
    );
    setStatus({ text: `Converting ${count(files.length, "SVG")}…${note}`, error: false });
    const update = (index: number, change: (result: Result) => Result) =>
      setResults((list) => list.map((result, at) => (at === index ? change(result) : result)));
    for (const [index, file] of files.entries()) {
      preview(file).then(
        (url) => update(index, (result) => ({ ...result, preview: url })),
        () => update(index, (result) => ({ ...result, preview: null })),
      );
    }

    const current = new Worker(engine, { type: "module" });
    worker.current = current;
    const failures: string[] = [];
    const converted = new Set<number>();
    const mark = (result: Result, format: Format, state: Step): Result => ({
      ...result,
      steps: result.steps.map((step) => (step.format === format ? { format, state } : step)),
    });

    current.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (worker.current !== current) return;
      const message = decode(data);
      if (!message) {
        stop();
        setStatus({ text: "The converter sent something it should not have.", error: true });
        return;
      }
      switch (message.type) {
        case "font":
          setFontList((list) => [
            ...list,
            { text: message.families.join(", ") || message.name, error: false },
          ]);
          return;
        case "font-error":
          failures.push(`${message.name}: ${message.message}`);
          setFontList((list) => [
            ...list,
            { text: `${message.name}: ${message.message}`, error: true },
          ]);
          return;
        case "open": {
          const size = `${message.width} × ${message.height}`;
          update(message.index, (result) => ({ ...result, size }));
          return;
        }
        case "step":
          update(message.index, (result) => mark(result, message.format, "running"));
          return;
        case "stepped":
          update(message.index, (result) => ({
            ...mark(result, message.format, "done"),
            files: [...result.files, ...message.files],
          }));
          return;
        case "converted":
          converted.add(message.index);
          return;
        case "failed": {
          const name = files[message.index]?.name ?? "An SVG";
          const text =
            message.code === noFonts
              ? `${name} has text but no fonts. Drop the .ttf, .otf or .ttc files it uses, or convert its text to outlines.`
              : message.message;
          failures.push(`${name}: ${text}`);
          update(message.index, (result) => ({
            ...result,
            steps: result.steps.map(({ format }) => ({ format, state: "pending" as const })),
            files: [],
            error: text,
          }));
          return;
        }
        case "done": {
          stop();
          if (message.zip === null) {
            setStatus({
              text: "Nothing was converted. The problems are listed below.",
              error: true,
            });
            return;
          }
          const first = files[0];
          const name = files.length === 1 && first ? `${stem(first.name)}.zip` : "archetypon.zip";
          const url = URL.createObjectURL(new Blob([message.zip], { type: "application/zip" }));
          setDownload({ url, name, bytes: message.zip.byteLength });
          const seconds = (message.ms / 1000).toFixed(1);
          const problems =
            failures.length === 0 ? "" : ` ${count(failures.length, "problem")} below.`;
          setStatus({
            text: `Converted ${converted.size} of ${count(files.length, "SVG")} in ${seconds} s.${problems}${note}`,
            error: failures.length > 0,
          });
          return;
        }
        case "error":
          stop();
          setStatus({ text: `Conversion failed: ${message.message}`, error: true });
          return;
      }
    };
    current.onerror = (event) => {
      event.preventDefault();
      if (worker.current !== current) return;
      stop();
      setStatus({
        text: `The converter could not start${event.message ? `: ${event.message}` : "."}`,
        error: true,
      });
    };

    void Promise.all([
      Promise.all(
        files.map(async (file) => ({ stem: stem(file.name), data: await file.arrayBuffer() })),
      ),
      Promise.all(
        fontFiles.map(async (file) => ({ name: file.name, data: await file.arrayBuffer() })),
      ),
    ]).then(
      ([svgData, fontData]) => {
        if (worker.current !== current) return;
        current.postMessage(
          { svgs: svgData, fonts: fontData, formats: options.formats, options: options.config },
          [...svgData, ...fontData].map((item) => item.data),
        );
      },
      (error: unknown) => {
        if (worker.current !== current) return;
        stop();
        setStatus({
          text: `The files could not be read: ${error instanceof Error ? error.message : String(error)}`,
          error: true,
        });
      },
    );
  }

  function add(dropped: readonly File[]) {
    let nextSvgs = svgs;
    let nextFonts = fonts;
    const ignored: string[] = [];
    for (const file of dropped) {
      const type = kind(file.name);
      if (type === "svg") nextSvgs = upsert(nextSvgs, file);
      else if (type === "font") nextFonts = upsert(nextFonts, file);
      else ignored.push(file.name);
    }
    setSvgs(nextSvgs);
    setFonts(nextFonts);
    const skipped = ignored.length > 0 ? ` Skipped ${ignored.join(", ")}.` : "";
    if (nextSvgs.length > 0) convert(nextSvgs, nextFonts, skipped);
    else if (ignored.length > 0) {
      setStatus({
        text: `Skipped ${ignored.join(", ")}: only SVG, SVGZ, TTF, OTF and TTC files work.`,
        error: true,
      });
    } else if (nextFonts.length > 0) {
      setStatus({ text: `${count(nextFonts.length, "font")} ready. Add an SVG.`, error: false });
    }
  }

  function clear() {
    stop();
    setSvgs([]);
    setFonts([]);
    setResults([]);
    setFontList([]);
    setDownload(null);
    setStatus(null);
  }

  // The whole page takes drops. Counting enters and leaves keeps child elements from
  // flickering the state as the pointer crosses them.
  const addRef = useRef(add);
  addRef.current = add;
  useEffect(() => {
    let depth = 0;
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      setDragging(depth > 0);
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      addRef.current([...event.dataTransfer.files]);
    };
    addEventListener("dragenter", enter);
    addEventListener("dragover", over);
    addEventListener("dragleave", leave);
    addEventListener("drop", drop);
    return () => {
      removeEventListener("dragenter", enter);
      removeEventListener("dragover", over);
      removeEventListener("dragleave", leave);
      removeEventListener("drop", drop);
    };
  }, []);

  // Options apply as they change: the files convert again after a short pause in typing.
  const convertRef = useRef(convert);
  convertRef.current = convert;
  const optionsChanged = useRef(false);
  useEffect(() => {
    if (!optionsChanged.current) {
      optionsChanged.current = true;
      return;
    }
    if (svgs.length === 0) return;
    const timer = setTimeout(() => convertRef.current(svgs, fonts), 400);
    return () => clearTimeout(timer);
  }, [selected, sizes, filled, quality]);

  /** Gives one toggle a state; a set keeps its identity when nothing changes. */
  function paint(key: Key, on: boolean) {
    const change = <T,>(current: ReadonlySet<T>, value: T): ReadonlySet<T> => {
      if (current.has(value) === on) return current;
      const next = new Set(current);
      if (on) next.add(value);
      else next.delete(value);
      return next;
    };
    if (key.group === "format") setSelected((current) => change(current, key.value));
    else setSizes((current) => change(current, key.value));
  }

  // Like selecting in Photos: press one toggle and drag across the others in its row to give
  // them all the state the first one took.
  const painting = useRef<{ group: Key["group"]; on: boolean } | null>(null);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const stroke = painting.current;
      if (stroke === null) return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const key = keyOf(target?.closest<HTMLElement>("[data-toggle]")?.dataset.toggle);
      if (key && key.group === stroke.group) paint(key, stroke.on);
    };
    const end = () => (painting.current = null);
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
    return () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
    };
  }, []);

  function toggle(key: Key, label: string, on: boolean) {
    return (
      <button
        {...stylex.props(ui.reset, ui.focusRing, styles.toggle, on && styles.on)}
        type="button"
        data-toggle={`${key.group}:${key.value}`}
        aria-pressed={on}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          // No focus or text selection from a pointer; the press itself picks.
          event.preventDefault();
          painting.current = { group: key.group, on: !on };
          paint(key, !on);
        }}
        // Keyboard only: a pointer already picked on press.
        onClick={(event) => event.detail === 0 && paint(key, !on)}
      >
        {label}
      </button>
    );
  }

  function typeQuality(event: TargetedEvent<HTMLInputElement, Event>) {
    const input = event.currentTarget;
    const value = cleanQuality(input.value);
    // Write a refused character straight back out, so it never shows.
    if (input.value !== value) input.value = value;
    setQuality(value);
  }

  const empty = svgs.length === 0 && fonts.length === 0;

  return (
    <div {...stylex.props(styles.tool)}>
      <p {...stylex.props(ui.prose, styles.prose)}>
        Drop SVG files on this page. They come back as SVG, PDF, PNG, WebP, JPEG and ICO, in one
        ZIP. It runs in your browser: nothing is uploaded.
      </p>

      <button
        {...stylex.props(ui.reset, ui.focusRing, styles.drop, dragging && styles.dragging)}
        type="button"
        onClick={() => picker.current?.click()}
      >
        <span {...stylex.props(styles.dropTitle)}>
          {dragging ? "Drop to add them" : "Drop SVG files here"}
        </span>
        <span {...stylex.props(styles.dropNote)}>
          or click to choose. Add the .ttf, .otf or .ttc fonts their text uses.
        </span>
      </button>
      <input
        ref={picker}
        {...stylex.props(ui.srOnly)}
        type="file"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        accept=".svg,.svgz,.ttf,.otf,.ttc,image/svg+xml"
        onChange={(event) => {
          const input = event.currentTarget;
          add([...(input.files ?? [])]);
          input.value = "";
        }}
      />

      <div {...stylex.props(styles.options)} role="group" aria-label="Options">
        <div {...stylex.props(styles.option)} role="group" aria-labelledby="archetypon-formats">
          <span {...stylex.props(styles.label)} id="archetypon-formats">
            Formats
          </span>
          <div {...stylex.props(styles.toggles)}>
            {formats.map((format) =>
              toggle({ group: "format", value: format }, labels[format], selected.has(format)),
            )}
          </div>
        </div>
        <div {...stylex.props(styles.option)} role="group" aria-labelledby="archetypon-sizes">
          <span {...stylex.props(styles.label)} id="archetypon-sizes">
            Sizes
          </span>
          <div {...stylex.props(styles.toggles)}>
            {sizeOptions.map((size) =>
              toggle({ group: "size", value: size }, String(size), sizes.has(size)),
            )}
          </div>
        </div>
        <div {...stylex.props(styles.option)}>
          <span {...stylex.props(styles.label)} id="archetypon-background">
            Background
          </span>
          <button
            {...stylex.props(ui.reset, ui.focusRing, styles.toggle, styles.on, styles.single)}
            type="button"
            aria-labelledby="archetypon-background archetypon-background-value"
            onClick={() => setFilled((current) => !current)}
          >
            <span id="archetypon-background-value">{filled ? "Opaque" : "Transparent"}</span>
          </button>
        </div>
        <label {...stylex.props(styles.option)}>
          <span {...stylex.props(styles.label)}>JPEG quality</span>
          <span {...stylex.props(styles.percent)}>
            <span {...stylex.props(styles.digits)}>
              {/* The empty columns show dark grey zeros (010%, 000%); the typed digits'
                  columns stay blank here, covered by the field's own text. */}
              <span {...stylex.props(ui.figures, styles.padding)} aria-hidden="true">
                {"0".repeat(3 - quality.length)}
                <span {...stylex.props(styles.typed)}>{quality}</span>
              </span>
              <input
                {...stylex.props(ui.figures, styles.input)}
                value={quality}
                inputMode="numeric"
                maxLength={3}
                autoComplete="off"
                aria-describedby="archetypon-quality"
                onInput={typeQuality}
                onBlur={() => (quality === "" || quality === "0") && setQuality("100")}
              />
            </span>
            <span aria-hidden="true">%</span>
          </span>
          <span {...stylex.props(ui.srOnly)} id="archetypon-quality">
            Percent, from 1 to 100
          </span>
        </label>
      </div>

      <p {...stylex.props(styles.status, status?.error === true && styles.problem)} role="status">
        {status?.text ?? ""}
      </p>

      {!empty && (
        <div {...stylex.props(styles.actions)}>
          {download && (
            <a
              {...stylex.props(ui.focusRing, styles.download)}
              href={download.url}
              download={download.name}
            >
              Download {download.name} ({formatBytes(download.bytes)})
            </a>
          )}
          <button {...stylex.props(ui.reset, ui.quiet, ui.focusRing)} type="button" onClick={clear}>
            Clear
          </button>
        </div>
      )}

      {fontList.length > 0 && (
        <ul {...stylex.props(styles.list)} aria-label="Fonts">
          {fontList.map((font) => (
            <li {...stylex.props(styles.meta, font.error && styles.problem)}>{font.text}</li>
          ))}
        </ul>
      )}

      {results.length > 0 && (
        <ol {...stylex.props(styles.list)} aria-label="Results">
          {results.map((result, index) => (
            <li {...stylex.props(styles.result, index > 0 && styles.divided)}>
              {result.preview ? (
                <img
                  {...stylex.props(styles.preview)}
                  src={result.preview}
                  alt=""
                  width={48}
                  height={48}
                />
              ) : (
                <span {...stylex.props(styles.preview)} />
              )}
              <div {...stylex.props(styles.body)}>
                <p {...stylex.props(styles.name)}>{result.name}</p>
                {result.size && <p {...stylex.props(styles.meta)}>{result.size}</p>}
                <ol {...stylex.props(styles.steps)} aria-label="Formats">
                  {result.steps.map(({ format, state }) => (
                    <li {...stylex.props(styles.step, styles[state])}>
                      {labels[format]}
                      <span {...stylex.props(ui.srOnly)}>
                        {state === "done" ? ", done" : state === "running" ? ", running" : ""}
                      </span>
                    </li>
                  ))}
                </ol>
                {result.error && (
                  <p {...stylex.props(styles.meta, styles.problem)}>{result.error}</p>
                )}
                {result.files.length > 0 && (
                  <details {...stylex.props(styles.details)}>
                    <summary {...stylex.props(ui.quiet, ui.focusRing, styles.summary)}>
                      {count(result.files.length, "file")},{" "}
                      {formatBytes(result.files.reduce((sum, file) => sum + file.size, 0))}
                    </summary>
                    <ul {...stylex.props(styles.files)}>
                      {result.files.map((file) => (
                        <li {...stylex.props(styles.file)}>
                          <span {...stylex.props(styles.path)}>{file.path}</span>
                          <span {...stylex.props(ui.figures)}>{formatBytes(file.size)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const styles = stylex.create({
  tool: { display: "flex", flexDirection: "column", gap: space.sectionGap },
  prose: { margin: 0, color: colors.article, fontWeight: colors.proseWeight },
  drop: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    minHeight: { default: "240px", [media.mobile]: "180px" },
    padding: space.sectionGap,
    borderRadius: space.mediaRadius,
    backgroundColor: colors.codeBg,
    textAlign: "center",
    // A ring drawn inside, so the surface never changes size while files hover over it.
    boxShadow: "inset 0 0 0 1px transparent",
    transitionProperty: "box-shadow",
    transitionDuration: { default: "0s", [media.motion]: "330ms" },
  },
  dragging: { boxShadow: `inset 0 0 0 1px ${colors.tertiary}` },
  dropTitle: { color: colors.primary },
  dropNote: { color: colors.tertiary, fontSize: "14px", lineHeight: "20px" },
  /**
   * The project table's spacing: the labels take the width of the longest, and the values
   * start one table gap after it.
   */
  options: {
    display: "grid",
    gridTemplateColumns: "max-content minmax(0, 1fr)",
    columnGap: { default: space.tableGap, [media.mobile]: space.mobileTableGap },
  },
  option: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    alignItems: "center",
    minHeight: { default: "40px", [media.mobile]: space.touchTarget },
    boxShadow: `inset 0 -1px ${colors.hairline}`,
  },
  label: { color: colors.secondary },
  toggles: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: { default: "12px", [media.mobile]: "8px" },
    // A finger dragging across the toggles picks them instead of scrolling the page.
    touchAction: "none",
  },
  // White is picked, dark grey is not. Nothing else changes color, hover included, so the
  // color always means one thing.
  toggle: {
    color: colors.tertiary,
    minHeight: { default: "40px", [media.mobile]: space.touchTarget },
  },
  on: { color: colors.primary },
  /** A toggle alone in its row: it names its state instead of dimming. */
  single: { justifySelf: "start" },
  percent: {
    display: "flex",
    alignItems: "center",
    color: colors.primary,
    minHeight: { default: "40px", [media.mobile]: space.touchTarget },
  },
  /** The field over its zero padding; both are set in the same three tabular columns. */
  digits: { position: "relative", display: "inline-block" },
  padding: { color: colors.tertiary, whiteSpace: "pre" },
  typed: { visibility: "hidden" },
  /**
   * Always three tabular digits wide and set flush right, so the % never moves: 98 fills the
   * last two columns and the padding's zero the first.
   */
  input: {
    position: "absolute",
    inset: 0,
    appearance: "none",
    width: "100%",
    textAlign: "right",
    padding: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    color: colors.primary,
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    fontFeatureSettings: "inherit",
    // Typing shows the caret; the field draws no ring or border around itself.
    outline: "none",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    // The table's gap, as between the option labels and their values.
    columnGap: { default: space.tableGap, [media.mobile]: space.mobileTableGap },
    alignItems: "baseline",
  },
  status: { margin: 0, color: colors.secondary, minHeight: "26px" },
  problem: { color: colors.primary },
  /** Set like the article links (`markdown.tsx`): hover turns the underline white. */
  download: {
    width: "fit-content",
    color: { default: colors.article, ":focus-visible": colors.primary },
    textDecorationLine: "underline",
    textDecorationColor: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
    },
  },
  list: { margin: 0, padding: 0, listStyle: "none" },
  result: {
    display: "grid",
    gridTemplateColumns: "48px minmax(0, 1fr)",
    columnGap: space.tableGap,
    alignItems: "start",
    paddingBlock: "16px",
  },
  divided: { boxShadow: `inset 0 1px ${colors.hairline}` },
  preview: {
    display: "block",
    width: "48px",
    height: "48px",
    objectFit: "contain",
    borderRadius: "8px",
    backgroundColor: colors.codeBg,
  },
  body: { minWidth: 0 },
  name: { margin: 0, color: colors.primary, overflowWrap: "anywhere" },
  meta: { margin: 0, color: colors.secondary },
  steps: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: "12px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  step: {
    transitionProperty: "color",
    transitionDuration: { default: "0s", [media.motion]: "330ms" },
  },
  pending: { color: colors.tertiary },
  running: { color: colors.secondary },
  done: { color: colors.primary },
  details: { marginTop: "4px" },
  summary: {
    cursor: "pointer",
    listStyle: "none",
    "::-webkit-details-marker": { display: "none" },
  },
  files: { margin: "8px 0 0", padding: 0, listStyle: "none", fontSize: "14px", lineHeight: "22px" },
  file: {
    display: "flex",
    justifyContent: "space-between",
    columnGap: space.tableGap,
    color: colors.secondary,
  },
  path: { minWidth: 0, overflowWrap: "anywhere" },
});
