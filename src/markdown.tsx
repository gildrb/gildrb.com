import { readdirSync } from "node:fs";
import * as stylex from "@stylexjs/stylex";
import type { ComponentChildren } from "preact";
import { Island } from "./island.tsx";
import { Command } from "./islands/command.tsx";
import { Fold } from "./islands/ben-davis.tsx";
import { Specimen } from "./islands/curves.tsx";
import { Terminal } from "./islands/heph.tsx";
import { media } from "./media.ts";
import { colors, space, underline } from "./tokens.stylex.ts";
import { ui } from "./ui.tsx";
import { versioned } from "./versioned.ts";

type Block =
  | { type: "h2" | "h3" | "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "media"; items: { id: string; caption: string }[] }
  | { type: "code"; language: string; title: string; code: string };

/** Figures that are live components rather than files in `media.ts`. */
export const demos = new Set(["heph-demo", "curves-demo", "ben-davis-demo"]);

const mediaLine = /^!\[(.*)\]\(media:([a-z0-9-]+)\)$/;

/** The images a page opens with, before any text: wide screens show them as a banner. */
export function bannerOf(blocks: Block[]): Extract<Block, { type: "media" }> | undefined {
  const [first] = blocks;
  return first?.type === "media" ? first : undefined;
}

/** Parses the case-study Markdown subset documented in README.md. */
export function parse(markdown: string): { title: string; blocks: Block[] } {
  const [titleLine = "", ...lines] = markdown.replaceAll("\r\n", "\n").trim().split("\n");
  if (!titleLine.startsWith("# ")) throw new Error("Case Markdown must begin with one # title.");
  const blocks: Block[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index] ?? "";
    const figure = line.match(mediaLine);
    if (!line) {
      index += 1;
    } else if (line.startsWith("## ") || line.startsWith("### ")) {
      blocks.push({ type: line.startsWith("## ") ? "h2" : "h3", text: line.replace(/^#+ /, "") });
      index += 1;
    } else if (figure) {
      const previous = blocks.at(-1);
      const item = { caption: figure[1] ?? "", id: figure[2] ?? "" };
      if (previous?.type === "media" && mediaLine.test(lines[index - 1] ?? "")) {
        previous.items.push(item);
      } else {
        blocks.push({ type: "media", items: [item] });
      }
      index += 1;
    } else if (line.startsWith("```")) {
      const end = lines.indexOf("```", index + 1);
      if (end === -1) throw new Error("Unclosed fenced code block.");
      blocks.push({
        type: "code",
        language: line.match(/^```(\S*)/)?.[1] ?? "",
        title: line.match(/title="([^"]+)"/)?.[1] ?? "",
        code: lines.slice(index + 1, end).join("\n"),
      });
      index = end + 1;
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      for (; lines[index]?.startsWith("- "); index += 1) items.push((lines[index] ?? "").slice(2));
      blocks.push({ type: "list", items });
    } else {
      const text: string[] = [];
      for (; /^(?!#|```|- |!\[)./.test(lines[index] ?? ""); index += 1)
        text.push(lines[index] ?? "");
      blocks.push({ type: "p", text: text.join(" ") });
    }
  }
  return { title: titleLine.slice(2), blocks };
}

const inline =
  /`([^`]+)`|\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^\s)]*)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

function Inline({ text }: { text: string }) {
  const source = text.trim();
  const nodes: ComponentChildren[] = [];
  let last = 0;
  for (const match of source.matchAll(inline)) {
    const [whole, code, label, href = "", strong, em] = match;
    nodes.push(source.slice(last, match.index));
    last = match.index + whole.length;
    if (code) nodes.push(<code {...stylex.props(ui.mono, styles.code)}>{code}</code>);
    else if (label) {
      const external = href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" };
      nodes.push(
        <a {...stylex.props(styles.link, ui.focusRing)} href={href} {...external}>
          {label}
        </a>,
      );
    } else if (strong) nodes.push(<strong {...stylex.props(styles.strong)}>{strong}</strong>);
    else nodes.push(<em>{em}</em>);
  }
  nodes.push(source.slice(last));
  return <>{nodes}</>;
}

const images = readdirSync("public/images/optimized");

function Image({
  id,
  sizes,
  eager,
  fill,
}: {
  id: string;
  sizes: string;
  eager: boolean;
  fill: boolean;
}) {
  const item = media[id];
  if (!item) throw new Error(`Unknown media id: ${id}`);
  const { src, srcset } = sources(id);
  return (
    <button
      type="button"
      {...stylex.props(
        ui.reset,
        ui.focusRing,
        styles.zoom,
        item.mark && styles.mark,
        item.mark === "center" && styles.centered,
        fill && styles.fill,
      )}
      aria-label={`Enlarge: ${item.alt}`}
      aria-expanded="false"
      data-zoom
    >
      <img
        {...stylex.props(
          styles.image,
          item.mark && styles.markImage,
          fill && (item.mark ? styles.contain : styles.cover),
        )}
        alt={item.alt}
        width={item.width}
        height={item.height}
        decoding="async"
        {...(eager ? { fetchpriority: "high" } : { loading: "lazy" })}
        src={src}
        {...(srcset && { srcset, sizes })}
      />
    </button>
  );
}

/**
 * A recording: a still poster until `video.ts` plays it, silently and on a loop, while it is on
 * screen and motion is allowed. Not enlargeable; it already spans its column.
 */
function Video({ id, fill }: { id: string; fill: boolean }) {
  const item = media[id];
  if (!item) throw new Error(`Unknown media id: ${id}`);
  return (
    <video
      {...stylex.props(styles.image, fill && styles.cover)}
      width={item.width}
      height={item.height}
      poster={sources(id).src}
      src={versioned(`/videos/gil-rodrigues-${id}.mp4`)}
      muted
      loop
      playsInline
      preload="none"
      aria-label={item.alt}
      data-autoplay
    />
  );
}

// Wide screens: the case pages' reading column, 592px. Two images in a row share it, less their
// 24px gap. A banner spans the table and the grid: the wrapper (at most 1900px, 32px padding)
// less the sidebar and its gap.
const singleSizes =
  "(min-width: 1280px) 592px, (max-width: 768px) calc(100vw - 24px), (max-width: 876px) calc(100vw - 336px), 540px";
const gridSizes =
  "(min-width: 1280px) 284px, (max-width: 768px) calc(100vw - 24px), (max-width: 876px) calc(50vw - 178px), 260px";
const bannerSizes =
  "(min-width: 1280px) calc(min(100vw, 1900px) - 352px), (max-width: 768px) calc(100vw - 24px), (max-width: 876px) calc(100vw - 336px), 540px";
const bannerGridSizes =
  "(min-width: 1280px) calc((min(100vw, 1900px) - 376px) / 2), (max-width: 768px) calc(100vw - 24px), (max-width: 876px) calc(50vw - 178px), 260px";

/** The `sizes` of an image in a banner or not, alone or one of a row of two. */
export function sizesFor(banner: boolean, grid: boolean): string {
  if (banner) return grid ? bannerGridSizes : bannerSizes;
  return grid ? gridSizes : singleSizes;
}

/** The responsive variants of `gil-rodrigues-<id>-<width>.<ext>`, or the single vector file. */
export function sources(id: string): { src: string; srcset?: string } {
  const pattern = new RegExp(`^gil-rodrigues-${id}(?:-(\\d+))?\\.\\w+$`);
  const files = images
    .map((file) => ({ file, width: Number(file.match(pattern)?.[1]) }))
    .filter(({ file }) => pattern.test(file))
    .toSorted((left, right) => left.width - right.width);
  const widest = files.findLast(({ width }) => width <= 960) ?? files[0];
  if (!widest) throw new Error(`No image files for media id: ${id}`);
  const src = versioned(`/images/optimized/${widest.file}`);
  if (!widest.width) return { src };
  const srcset = files
    .map(({ file, width }) => `${versioned(`/images/optimized/${file}`)} ${width}w`)
    .join(", ");
  return { src, srcset };
}

function Figures({
  items,
  eager,
  banner,
}: {
  items: { id: string; caption: string }[];
  eager: boolean;
  banner: boolean;
}) {
  const grid = items.length > 1;
  return (
    <div {...stylex.props(styles.media, grid && styles.grid)}>
      {items.map(({ id, caption }, index) => (
        <figure
          {...stylex.props(
            styles.figure,
            banner && styles.window,
            banner && media[id]?.frame && styles.frame,
          )}
        >
          {id === "heph-demo" ? (
            <Island name="heph" component={Terminal} props={{ fill: banner }} />
          ) : id === "curves-demo" ? (
            <Island
              name="curves"
              component={Specimen}
              props={{ fill: banner, font: versioned("/fonts/curves.woff2") }}
            />
          ) : id === "ben-davis-demo" ? (
            <Island
              name="ben-davis"
              component={Fold}
              props={{
                fill: banner,
                player: versioned("/ben-davis/lottie.min.js"),
                animation: versioned("/ben-davis/ben-davis-hover.json"),
              }}
            />
          ) : media[id]?.video ? (
            <Video id={id} fill={banner} />
          ) : (
            <Image
              id={id}
              sizes={sizesFor(banner, grid)}
              eager={eager && index === 0}
              fill={banner}
            />
          )}
          {caption && (
            <figcaption {...stylex.props(styles.small, styles.caption)}>
              <Inline text={caption} />
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

type Token = [kind: keyof typeof tokenStyles | null, text: string];

/** Tokenizes TOML well enough to tint keys, strings, numbers, comments and punctuation. */
function toml(source: string): Token[] {
  const tokens: Token[] = [];
  let tableDepth = 0;
  let arrayDepth = 0;
  let valueContext = false;
  let lineStart = true;
  for (let rest = source; rest;) {
    const [text = "", kind]: [string | undefined, Token[0]] = rest.startsWith("#")
      ? [rest.match(/^[^\n]*/)?.[0], "comment"]
      : /^["']/.test(rest)
        ? [rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/)?.[0] ?? rest, "string"]
        : /^\s/.test(rest)
          ? [rest.match(/^\s+/)?.[0], null]
          : /^-?(?:\d|\.\d)/.test(rest)
            ? [rest.match(/^-?(?:\d+(?:\.\d+)?|\.\d+)[a-zA-Z]*/)?.[0], "number"]
            : /^[a-zA-Z_]/.test(rest)
              ? [rest.match(/^[a-zA-Z_][\w.-]*/)?.[0], null]
              : [rest.charAt(0), null];
    let tokenKind: Token[0] = kind;
    if (!kind && /^[a-zA-Z_]/.test(text)) {
      const next = rest.slice(text.length).match(/^\s*([=.\]])/)?.[1];
      tokenKind = tableDepth > 0 || next === "=" ? "key" : "value";
      valueContext = false;
    } else if (!kind && "[]{},.".includes(text)) {
      tokenKind = "punctuation";
      if (text === "[" && (arrayDepth > 0 || valueContext)) {
        arrayDepth += 1;
        valueContext = false;
      } else if (text === "[") {
        if (tableDepth > 0 || lineStart) tableDepth += 1;
        else arrayDepth += 1;
      } else if (text === "]") {
        if (arrayDepth > 0) arrayDepth -= 1;
        else if (tableDepth > 0) tableDepth -= 1;
      }
    } else if (!kind && text === "=") {
      tokenKind = "operator";
      valueContext = true;
    }
    lineStart = tokenKind === null && /^\s+$/.test(text) ? lineStart || text.includes("\n") : false;
    tokens.push([tokenKind, text]);
    rest = rest.slice(text.length);
  }
  return tokens;
}

function Code({ language, title, code }: { language: string; title: string; code: string }) {
  const label = title && (
    <p {...stylex.props(styles.small, styles.codeLabel)}>
      <Inline text={title} />
    </p>
  );
  // A shell block is commands to run in order: one block, one copy button for all of them.
  if (language === "sh")
    return (
      <>
        {label}
        <Island
          name="command"
          component={Command}
          props={{ commands: code.split("\n").filter((line) => line.trim() !== "") }}
        />
      </>
    );
  const tokens: Token[] = language === "toml" ? toml(code) : [[null, code]];
  return (
    <>
      {label}
      <pre {...stylex.props(ui.mono, styles.pre)}>
        <code>
          {tokens.map(([kind, text]) =>
            text
              .split(/([\u2190-\u2199])/)
              .map((part, index) =>
                index % 2 ? (
                  <span {...stylex.props(ui.sans)}>{part}</span>
                ) : kind ? (
                  <span {...stylex.props(tokenStyles[kind])}>{part}</span>
                ) : (
                  part
                ),
              ),
          )}
        </code>
      </pre>
    </>
  );
}

/** A heading's text without its inline Markdown, as the contents list shows it. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*]/g, "")
    .trim();
}

export type Heading = { id: string; text: string };

type Anchor = Heading & { top: boolean };

/**
 * Every heading's anchor, by block index, and whether it opens a part of the page. A `##` always
 * does; a `###` does before the first `##` (case studies have none) and is a subheading after it.
 */
function anchors(blocks: readonly Block[]): Map<number, Anchor> {
  const found = new Map<number, Anchor>();
  const used = new Set<string>();
  let chapter = false;
  blocks.forEach((block, index) => {
    if (block.type !== "h2" && block.type !== "h3") return;
    if (block.type === "h2") chapter = true;
    const text = plain(block.text);
    const base =
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "part";
    let id = base;
    for (let count = 2; used.has(id); count += 1) id = `${base}-${count}`;
    used.add(id);
    found.set(index, { id, text, top: block.type === "h2" || !chapter });
  });
  return found;
}

/** The parts of a page, for its contents list. */
export function outline(markdown: string): Heading[] {
  return [...anchors(parse(markdown).blocks).values()]
    .filter(({ top }) => top)
    .map(({ id, text }) => ({ id, text }));
}

/** What a block is, for the space above it. */
type Kind = "part" | "subheading" | "text" | "figure";

/** The space above a block; see `gap`. */
type Spacing = "partGap" | "headingGap" | "lineGap";

/**
 * The page's vertical rhythm, on the 24px line: a part opens two lines below what came before, a
 * heading sits 8px above its own text, and every other block is one line from the last.
 */
function gap(kind: Kind, previous: Kind | null): Spacing | null {
  if (previous === null) return null;
  if (kind === "part") return "partGap";
  if (previous === "part" || previous === "subheading") return "headingGap";
  return "lineGap";
}

/**
 * Renders a page's Markdown, every page alike: the title for screen readers (the breadcrumb shows
 * it), then the blocks. The first paragraph is the opening, at full contrast, wherever it stands
 * (n0thing opens with an image and a part). `elsewhere` (the Elsewhere line) follows it, then
 * `tool` (Archetypon's converter). `eager` gives the first image high fetch priority. `reading`
 * (`Main`'s reading layout): images keep the reading column, and the images a page opens with
 * span the homepage's table and grid as a banner.
 */
export function Article({
  markdown,
  eager,
  elsewhere = null,
  tool = null,
  reading = false,
}: {
  markdown: string;
  eager: boolean;
  elsewhere?: ComponentChildren;
  tool?: ComponentChildren;
  reading?: boolean;
}) {
  const { title, blocks } = parse(markdown);
  const found = anchors(blocks);
  const firstMedia = blocks.find((block) => block.type === "media");
  const banner = reading ? bannerOf(blocks) : undefined;
  const opening = blocks.findIndex((block) => block.type === "p");
  const nodes: ComponentChildren[] = [];
  let previous: Kind | null = null;
  let pendingTool = tool;
  /** Text keeps its measure; images may be wider, up to the whole article for a banner. */
  const place = (
    kind: Kind,
    render: (
      layout: readonly [
        false | (typeof styles)[Spacing],
        false | typeof styles.measure | typeof styles.figureMeasure,
      ],
    ) => ComponentChildren,
    width: false | typeof styles.measure | typeof styles.figureMeasure = styles.measure,
  ) => {
    const spacing = gap(kind, previous);
    nodes.push(render([spacing !== null && styles[spacing], width]));
    previous = kind;
  };
  const placeTool = () => {
    if (pendingTool === null || pendingTool === undefined) return;
    const content = pendingTool;
    pendingTool = null;
    place("figure", (spacing) => <div {...stylex.props(spacing)}>{content}</div>);
  };
  for (const [index, block] of blocks.entries()) {
    const anchor = found.get(index);
    if (index === opening + 1 && opening !== -1 && elsewhere !== null)
      place("text", (spacing) => <div {...stylex.props(spacing)}>{elsewhere}</div>);
    if (anchor?.top === true) placeTool();
    switch (block.type) {
      case "h2":
      case "h3": {
        const top = anchor?.top === true;
        const Tag = top ? "h2" : "h3";
        place(top ? "part" : "subheading", (spacing) => (
          <Tag
            {...stylex.props(
              ui.prose,
              styles.heading,
              top ? [ui.heading, styles.part] : styles.subheading,
              spacing,
            )}
            id={anchor?.id}
          >
            <Inline text={block.text} />
          </Tag>
        ));
        break;
      }
      case "p":
        place("text", (spacing) => (
          <p {...stylex.props(ui.prose, styles.prose, index === opening && styles.lede, spacing)}>
            <Inline text={block.text} />
          </p>
        ));
        break;
      case "list":
        place("text", (spacing) => (
          <ul {...stylex.props(styles.list, spacing)}>
            {block.items.map((item, itemIndex) => (
              <li
                {...stylex.props(
                  ui.prose,
                  styles.prose,
                  styles.item,
                  itemIndex > 0 && styles.nextItem,
                )}
              >
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ));
        break;
      case "media":
        place(
          "figure",
          (spacing) => (
            <div {...stylex.props(spacing)}>
              <Figures
                items={block.items}
                eager={eager && block === firstMedia}
                banner={block === banner}
              />
            </div>
          ),
          block === banner ? false : reading && styles.figureMeasure,
        );
        break;
      case "code":
        place("figure", (spacing) => (
          <div {...stylex.props(spacing)}>
            <Code language={block.language} title={block.title} code={block.code} />
          </div>
        ));
        break;
      default: {
        const _: never = block;
        return _;
      }
    }
  }
  placeTool();
  return (
    <>
      <h1 {...stylex.props(ui.prose, styles.heading, ui.srOnly)}>
        <Inline text={title} />
      </h1>
      {nodes}
    </>
  );
}

export const styles = stylex.create({
  /** Every heading: on the page's 24px line, clear of the top when jumped to. */
  heading: {
    color: colors.primary,
    lineHeight: "24px",
    scrollMarginTop: { default: space.pageInset, "@media (max-width: 767px)": "72px" },
  },
  /** A part of the page: as large as the name and the breadcrumb, never larger. */
  part: { fontWeight: 400 },
  /** A step inside a part: running-text size, set apart by weight. */
  subheading: { fontSize: "16px", fontWeight: 500 },
  prose: { color: colors.article, fontWeight: colors.proseWeight },
  /** The opening paragraph: what the work is, at full contrast. */
  lede: { color: colors.primary },
  /** The text's width. */
  measure: { maxWidth: space.contentColumn },
  /** An image's width in the case pages' reading column. */
  figureMeasure: { maxWidth: space.figureColumn },
  partGap: { marginTop: "48px" },
  headingGap: { marginTop: "8px" },
  lineGap: { marginTop: "24px" },
  list: { paddingLeft: "20px", listStyleType: "square" },
  item: { "::marker": { color: colors.tertiary } },
  nextItem: { marginTop: "8px" },
  link: {
    color: { default: colors.article, ":focus-visible": colors.primary },
    textDecorationLine: "underline",
    textDecorationThickness: underline.thickness,
    textUnderlineOffset: underline.offset,
    textDecorationColor: {
      default: colors.tertiary,
      ":hover": { "@media (hover: hover)": colors.article },
    },
  },
  code: {
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "18px",
    padding: "1px 5px",
    borderRadius: "2px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.codeBorder,
    backgroundColor: colors.codeBg,
    color: colors.primary,
  },
  strong: { color: colors.primary, fontWeight: 500 },
  small: { color: colors.tertiary, fontSize: "14px", lineHeight: "20px" },
  media: { width: "100%" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      "@media (max-width: 768px)": "1fr",
    },
    gap: "24px",
  },
  figure: { minWidth: 0 },
  /**
   * A banner's window on wide screens, where banners span the table and grid: 4:3, but never so
   * tall that the first heading leaves the first screen. Every case page's text starts at the
   * same height; the artwork is cut at the window's edge and keeps going past it.
   */
  window: {
    aspectRatio: { default: null, "@media (min-width: 1280px)": "4 / 3" },
    maxHeight: { default: null, "@media (min-width: 1280px)": "calc(100svh - 240px)" },
    overflow: "hidden",
  },
  /** The demos' banner frame (`ben-davis.tsx`): the homepage table's hairline, over the artwork. */
  frame: {
    position: "relative",
    "::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      boxShadow: `inset 0 0 0 1px ${colors.hairline}`,
      pointerEvents: "none",
    },
  },
  /** Fills the banner window on wide screens: artwork is cropped, a mark is shown whole. */
  fill: { height: { default: null, "@media (min-width: 1280px)": "100%" } },
  cover: {
    height: { default: "auto", "@media (min-width: 1280px)": "100%" },
    objectFit: "cover",
    objectPosition: "50% 0",
  },
  contain: {
    height: { default: "auto", "@media (min-width: 1280px)": "100%" },
    objectFit: "contain",
  },
  image: {
    display: "block",
    width: "100%",
    height: "auto",
    userSelect: "none",
    WebkitUserDrag: "none",
  },
  /** The button around each image; `zoom.ts` enlarges it on click where there is room. */
  zoom: {
    display: "block",
    width: "100%",
    cursor: { default: "auto", "@media (min-width: 768px)": "zoom-in" },
  },
  mark: { width: "88%" },
  markImage: { filter: colors.artworkFilter },
  centered: { marginInline: "auto" },
  caption: { marginTop: "8px" },
  codeLabel: { marginBottom: "8px" },
  pre: {
    overflowX: "auto",
    padding: "12px 16px",
    borderRadius: "4px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.codeBorder,
    backgroundColor: colors.codeBg,
    color: colors.primary,
    fontSize: "14px",
    lineHeight: "24px",
    tabSize: 4,
  },
});

const tokenStyles = stylex.create({
  key: { color: colors.primary },
  value: { color: colors.secondary },
  string: { color: colors.secondary },
  number: { color: colors.secondary },
  comment: { color: colors.tertiary },
  punctuation: { color: colors.tertiary },
  operator: { color: colors.tertiary },
});
