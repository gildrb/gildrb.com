import * as stylex from "@stylexjs/stylex";
import type { TargetedEvent } from "preact";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { colors, media, space, underline } from "../tokens.stylex.ts";
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
  typeof value === "string" && formats.some((format) => format === value);
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

const sizeDigits = (value: number) => value.toFixed(value < 10 ? 1 : 0);

function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  let value = bytes / 1000;
  for (const unit of ["kB", "MB"] as const) {
    if (value < 1000) return `${sizeDigits(value)} ${unit}`;
    value /= 1000;
  }
  return `${sizeDigits(value)} GB`;
}

function mark(result: Result, format: Format, state: Step): Result {
  return {
    ...result,
    steps: result.steps.map((step) => (step.format === format ? { format, state } : step)),
  };
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

/** The options as picked; a new object whenever one of them changes. */
type Settings = {
  selected: ReadonlySet<Format>;
  sizes: ReadonlySet<number>;
  filled: boolean;
  quality: string;
};

function readOptions({ selected, sizes, filled, quality }: Settings): Options {
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

/** One conversion: the files, and the options already read for the engine. */
type Job = {
  files: readonly File[];
  fonts: readonly File[];
  formats: Format[];
  config: string;
  note: string;
};

/** Where a running conversion reports to. */
type Sink = {
  /** Whether this run is still the current one; a newer run or a clear silences it. */
  live: () => boolean;
  stop: () => void;
  update: (index: number, change: (result: Result) => Result) => void;
  addFont: (font: Font) => void;
  setStatus: (status: Status) => void;
  setDownload: (download: Download) => void;
};

/** Sends a job to a fresh engine and reports what it says until it is done. */
function run(current: Worker, job: Job, sink: Sink): void {
  const { files, note } = job;
  const failures: string[] = [];
  const converted = new Set<number>();

  current.addEventListener("message", ({ data }: MessageEvent<unknown>) => {
    if (!sink.live()) return;
    const message = decode(data);
    if (!message) {
      sink.stop();
      sink.setStatus({ text: "The converter sent something it should not have.", error: true });
      return;
    }
    switch (message.type) {
      case "font":
        sink.addFont({ text: message.families.join(", ") || message.name, error: false });
        return;
      case "font-error":
        failures.push(`${message.name}: ${message.message}`);
        sink.addFont({ text: `${message.name}: ${message.message}`, error: true });
        return;
      case "open": {
        const size = `${message.width} × ${message.height}`;
        sink.update(message.index, (result) => ({ ...result, size }));
        return;
      }
      case "step":
        sink.update(message.index, (result) => mark(result, message.format, "running"));
        return;
      case "stepped":
        sink.update(message.index, (result) => ({
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
        sink.update(message.index, (result) => ({
          ...result,
          steps: result.steps.map(({ format }) => ({ format, state: "pending" as const })),
          files: [],
          error: text,
        }));
        return;
      }
      case "done": {
        sink.stop();
        if (message.zip === null) {
          sink.setStatus({
            text: "Nothing was converted. The problems are listed below.",
            error: true,
          });
          return;
        }
        const first = files[0];
        const name = files.length === 1 && first ? `${stem(first.name)}.zip` : "archetypon.zip";
        const url = URL.createObjectURL(new Blob([message.zip], { type: "application/zip" }));
        sink.setDownload({ url, name, bytes: message.zip.byteLength });
        const seconds = (message.ms / 1000).toFixed(1);
        const problems =
          failures.length === 0 ? "" : ` ${count(failures.length, "problem")} below.`;
        sink.setStatus({
          text: `Converted ${converted.size} of ${count(files.length, "SVG")} in ${seconds} s.${problems}${note}`,
          error: failures.length > 0,
        });
        return;
      }
      case "error":
        sink.stop();
        sink.setStatus({ text: `Conversion failed: ${message.message}`, error: true });
        return;
    }
  });
  current.addEventListener("error", (event) => {
    event.preventDefault();
    if (!sink.live()) return;
    sink.stop();
    sink.setStatus({
      text: `The converter could not start${event.message ? `: ${event.message}` : "."}`,
      error: true,
    });
  });

  void Promise.all([
    Promise.all(
      files.map(async (file) => ({ stem: stem(file.name), data: await file.arrayBuffer() })),
    ),
    Promise.all(
      job.fonts.map(async (file) => ({ name: file.name, data: await file.arrayBuffer() })),
    ),
  ]).then(
    ([svgData, fontData]) => {
      if (!sink.live()) return;
      current.postMessage(
        { svgs: svgData, fonts: fontData, formats: job.formats, options: job.config },
        [...svgData, ...fontData].map((item) => item.data),
      );
    },
    (error: unknown) => {
      if (!sink.live()) return;
      sink.stop();
      sink.setStatus({
        text: `The files could not be read: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      });
    },
  );
}

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
  const settings = useMemo<Settings>(
    () => ({ selected, sizes, filled, quality }),
    [selected, sizes, filled, quality],
  );
  // The settings of the last conversion: once they differ, the options have changed since.
  const [applied, setApplied] = useState(settings);

  // Stop the engine and free the ZIP when the page goes away.
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => () => void (download && URL.revokeObjectURL(download.url)), [download]);

  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
  }, []);

  const convert = useCallback(
    (files: readonly File[], fontFiles: readonly File[], note = "") => {
      if (files.length === 0) return;
      setApplied(settings);
      const options = readOptions(settings);
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
      run(
        current,
        { files, fonts: fontFiles, formats: options.formats, config: options.config, note },
        {
          live: () => worker.current === current,
          stop,
          update,
          addFont: (font) => setFontList((list) => [...list, font]),
          setStatus,
          setDownload,
        },
      );
    },
    [settings, stop],
  );

  const add = useCallback(
    (dropped: readonly File[]) => {
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
    },
    [svgs, fonts, convert],
  );

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
  // flickering the state as the pointer crosses them; the count outlives the listeners, which
  // change with the files.
  const dragDepth = useRef(0);
  useEffect(() => {
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      setDragging(dragDepth.current > 0);
    };
    const drop = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      add([...event.dataTransfer.files]);
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
  }, [add]);

  // Options apply as they change: the files convert again after a short pause in typing.
  useEffect(() => {
    if (applied === settings || svgs.length === 0) return undefined;
    const timer = setTimeout(() => convert(svgs, fonts), 400);
    return () => clearTimeout(timer);
  }, [applied, settings, svgs, fonts, convert]);

  /** Gives one toggle a state; a set keeps its identity when nothing changes. */
  const paint = useCallback((key: Key, on: boolean) => {
    const change = <T,>(current: ReadonlySet<T>, value: T): ReadonlySet<T> => {
      if (current.has(value) === on) return current;
      const next = new Set(current);
      if (on) next.add(value);
      else next.delete(value);
      return next;
    };
    if (key.group === "format") setSelected((current) => change(current, key.value));
    else setSizes((current) => change(current, key.value));
  }, []);

  const empty = svgs.length === 0 && fonts.length === 0;

  return (
    <div {...stylex.props(styles.tool)}>
      <DropZone dragging={dragging} onFiles={add} />

      <OptionsPanel
        selected={selected}
        sizes={sizes}
        filled={filled}
        quality={quality}
        onPaint={paint}
        onFilledChange={setFilled}
        onQualityChange={setQuality}
      />

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

      {results.length > 0 && <ResultList results={results} />}
    </div>
  );
}

type DropZoneProps = { dragging: boolean; onFiles: (files: readonly File[]) => void };

/**
 * The whole page takes dropped files (`Converter`); this line says so and opens the file picker.
 * While files hover over the page, it says where they go.
 */
function DropZone({ dragging, onFiles }: DropZoneProps) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <p {...stylex.props(ui.prose, styles.intake, dragging && styles.dragging)}>
        {dragging ? (
          "Drop the files to add them."
        ) : (
          <>
            Drop SVG files on this page, or{" "}
            <button
              {...stylex.props(ui.reset, ui.focusRing, styles.choose)}
              type="button"
              onClick={() => picker.current?.click()}
            >
              choose them
            </button>
            . Add the .ttf, .otf or .ttc fonts that their text uses.
          </>
        )}
      </p>
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
          onFiles([...(input.files ?? [])]);
          input.value = "";
        }}
      />
    </>
  );
}

type OptionsPanelProps = Settings & {
  onPaint: (key: Key, on: boolean) => void;
  onFilledChange: (filled: boolean) => void;
  onQualityChange: (quality: string) => void;
};

function OptionsPanel({
  selected,
  sizes,
  filled,
  quality,
  onPaint,
  onFilledChange,
  onQualityChange,
}: OptionsPanelProps) {
  // Like selecting in Photos: press one toggle and drag across the others in its row to give
  // them all the state the first one took.
  const painting = useRef<{ group: Key["group"]; on: boolean } | null>(null);
  // A finger picks on release (click), so dragging across the table still scrolls the page.
  const tapping = useRef(false);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const stroke = painting.current;
      if (stroke === null) return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const key = keyOf(target?.closest<HTMLElement>("[data-toggle]")?.dataset.toggle);
      if (key && key.group === stroke.group) onPaint(key, stroke.on);
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
  }, [onPaint]);

  function toggle(key: Key, label: string, on: boolean, row: number) {
    return (
      <button
        {...stylex.props(ui.reset, ui.focusRing, styles.toggle, on && styles.on)}
        // Its cell in the table: formats in the first column, sizes in the second.
        style={{ gridRow: String(row), gridColumn: key.group === "format" ? "1" : "2" }}
        type="button"
        data-toggle={`${key.group}:${key.value}`}
        aria-pressed={on}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          tapping.current = event.pointerType === "touch";
          if (tapping.current) return;
          // No focus or text selection from a pointer; the press itself picks.
          event.preventDefault();
          painting.current = { group: key.group, on: !on };
          onPaint(key, !on);
        }}
        // Keyboard, or a finger: a mouse or pen already picked on press.
        onClick={(event) => {
          if (event.detail !== 0 && !tapping.current) return;
          tapping.current = false;
          onPaint(key, !on);
        }}
      >
        {label}
      </button>
    );
  }

  function typeQuality(event: TargetedEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const value = cleanQuality(input.value);
    // Write a refused character straight back out, so it never shows.
    if (input.value !== value) input.value = value;
    onQualityChange(value);
  }

  // A table like the homepage's: the options are its columns, each value a row below its name.
  // The rows' hairlines run under all four columns.
  return (
    <div {...stylex.props(ui.text, styles.options)} role="group" aria-label="Options">
      <span {...stylex.props(styles.head, styles.formatColumn)} id="archetypon-formats">
        Format
      </span>
      <span {...stylex.props(styles.head, styles.sizeColumn)} id="archetypon-sizes">
        Size
      </span>
      <span {...stylex.props(styles.head, styles.backgroundColumn)} id="archetypon-background">
        Background
      </span>
      <span {...stylex.props(styles.head, styles.qualityColumn)} id="archetypon-quality-name">
        Quality
      </span>
      {sizeOptions.map((size, index) => (
        <span
          key={size}
          {...stylex.props(styles.rule)}
          style={{ gridRow: String(index + 2) }}
          aria-hidden="true"
        />
      ))}
      <div
        {...stylex.props(styles.column, styles.formatColumn)}
        role="group"
        aria-labelledby="archetypon-formats"
      >
        {formats.map((format, index) =>
          toggle(
            { group: "format", value: format },
            labels[format],
            selected.has(format),
            index + 2,
          ),
        )}
      </div>
      <div
        {...stylex.props(styles.column, styles.sizeColumn)}
        role="group"
        aria-labelledby="archetypon-sizes"
      >
        {sizeOptions.map((size, index) =>
          toggle({ group: "size", value: size }, String(size), sizes.has(size), index + 2),
        )}
      </div>
      <button
        {...stylex.props(ui.reset, ui.focusRing, styles.toggle, styles.on, styles.backgroundColumn)}
        style={{ gridRow: "2" }}
        type="button"
        aria-labelledby="archetypon-background archetypon-background-value"
        onClick={() => onFilledChange(!filled)}
      >
        <span id="archetypon-background-value">{filled ? "Opaque" : "Transparent"}</span>
      </button>
      <label {...stylex.props(styles.percent, styles.qualityColumn)} style={{ gridRow: "2" }}>
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
            spellcheck={false}
            aria-labelledby="archetypon-quality-name"
            aria-describedby="archetypon-quality"
            onInput={typeQuality}
            onBlur={() => (quality === "" || quality === "0") && onQualityChange("100")}
          />
        </span>
        <span aria-hidden="true">%</span>
        <span {...stylex.props(ui.srOnly)} id="archetypon-quality">
          JPEG quality, in percent, from 1 to 100
        </span>
      </label>
    </div>
  );
}

function ResultList({ results }: { results: readonly Result[] }) {
  return (
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
            {result.error && <p {...stylex.props(styles.meta, styles.problem)}>{result.error}</p>}
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
  );
}

const styles = stylex.create({
  tool: { display: "flex", flexDirection: "column", gap: space.sectionGap },
  /** The line that takes files; the whole page takes dropped ones. */
  intake: { margin: 0, color: colors.article, fontWeight: colors.proseWeight },
  /** Files hover over the page: the line says where they go, at full contrast. */
  dragging: { color: colors.primary },
  /** Set like the article links (`markdown.tsx`), inside the sentence. */
  choose: {
    display: "inline",
    color: { default: colors.article, ":focus-visible": colors.primary },
    textDecorationLine: "underline",
    textDecorationThickness: underline.thickness,
    textUnderlineOffset: underline.offset,
    textDecorationColor: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.article },
    },
  },
  /**
   * The homepage table's grid (`space.tableColumns`): a header row of names, then rows at the
   * table's pitch with a hairline above each.
   */
  options: {
    display: "grid",
    gridTemplateColumns: space.tableColumns,
    gridTemplateRows: "auto",
    gridAutoRows: { default: "40px", [media.mobile]: space.touchTarget },
    columnGap: { default: space.tableGap, [media.mobile]: space.mobileTableGap },
    alignItems: "center",
  },
  head: {
    gridRow: 1,
    alignSelf: "start",
    color: colors.secondary,
    paddingBottom: { default: space.portfolioRowPadding, [media.mobile]: space.touchInset },
  },
  formatColumn: { gridColumn: 1 },
  sizeColumn: { gridColumn: 2 },
  backgroundColumn: { gridColumn: 3 },
  qualityColumn: { gridColumn: 4, justifySelf: "end" },
  /** A column's toggles take no box, so each sits in its own row of the table's grid. */
  column: { display: "contents" },
  /** A body row's hairline, across all four columns; the first one closes the header. */
  rule: {
    gridColumn: "1 / -1",
    alignSelf: "stretch",
    boxShadow: `inset 0 1px ${colors.hairline}`,
    pointerEvents: "none",
  },
  // White is picked, dark grey is not. Nothing else changes color, hover included, so the
  // color always means one thing.
  toggle: {
    alignSelf: "stretch",
    justifySelf: "start",
    display: "flex",
    alignItems: "center",
    color: colors.tertiary,
    // A finger scrolls the page across the table and picks on release.
    touchAction: "manipulation",
  },
  on: { color: colors.primary },
  percent: {
    alignSelf: "stretch",
    display: "flex",
    alignItems: "center",
    color: colors.primary,
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
  /** Takes no room until it has something to say; it stays in the page so it is announced. */
  status: {
    margin: 0,
    marginTop: { default: 0, ":empty": `calc(${space.sectionGap} * -1)` },
    color: colors.secondary,
    minHeight: { default: "24px", ":empty": 0 },
  },
  problem: { color: colors.primary },
  /** Set like the article links (`markdown.tsx`): hover turns the underline the text color. */
  download: {
    width: "fit-content",
    color: { default: colors.article, ":focus-visible": colors.primary },
    textDecorationLine: "underline",
    textDecorationThickness: underline.thickness,
    textUnderlineOffset: underline.offset,
    textDecorationColor: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.article },
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
    borderRadius: "2px",
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
    transitionDuration: { default: "0s", [media.motion]: "200ms" },
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
