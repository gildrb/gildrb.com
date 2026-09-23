import { readdirSync } from "node:fs";
import * as stylex from "@stylexjs/stylex";
import type { ComponentChildren } from "preact";
import { Island } from "./island.tsx";
import { Terminal } from "./islands/heph.tsx";
import { media } from "./media.ts";
import { colors, space } from "./tokens.stylex.ts";
import { ui } from "./ui.tsx";

type Block =
  | { type: "h2" | "h3" | "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "media"; items: { id: string; caption: string }[] }
  | { type: "code"; language: string; title: string; code: string };

const mediaLine = /^!\[(.*)\]\(media:([a-z0-9-]+)\)$/;

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

function Image({ id, grid, eager }: { id: string; grid: boolean; eager: boolean }) {
  const item = media[id];
  if (!item) throw new Error(`Unknown media id: ${id}`);
  const { src, srcset } = sources(id);
  return (
    <img
      {...stylex.props(
        styles.image,
        item.mark && styles.mark,
        item.mark === "center" && styles.centered,
      )}
      alt={item.alt}
      width={item.width}
      height={item.height}
      decoding="async"
      {...(eager ? { fetchpriority: "high" } : { loading: "lazy" })}
      src={src}
      {...(srcset && { srcset, sizes: grid ? gridSizes : singleSizes })}
    />
  );
}

export const singleSizes =
  "(max-width: 768px) calc(100vw - 24px), (max-width: 876px) calc(100vw - 336px), 540px";
const gridSizes =
  "(max-width: 768px) calc(100vw - 24px), (max-width: 876px) calc(50vw - 178px), 260px";

/** The responsive variants of `gil-rodrigues-<id>-<width>.<ext>`, or the single vector file. */
export function sources(id: string): { src: string; srcset?: string } {
  const pattern = new RegExp(`^gil-rodrigues-${id}(?:-(\\d+))?\\.\\w+$`);
  const files = images
    .map((file) => ({ file, width: Number(file.match(pattern)?.[1]) }))
    .filter(({ file }) => pattern.test(file))
    .sort((left, right) => left.width - right.width);
  const widest = files.findLast(({ width }) => width <= 960) ?? files[0];
  if (!widest) throw new Error(`No image files for media id: ${id}`);
  const src = `/images/optimized/${widest.file}`;
  if (!widest.width) return { src };
  const srcset = files.map(({ file, width }) => `/images/optimized/${file} ${width}w`).join(", ");
  return { src, srcset };
}

function Figures({ items, eager }: { items: { id: string; caption: string }[]; eager: boolean }) {
  const grid = items.length > 1;
  return (
    <div {...stylex.props(styles.media, grid && styles.grid)}>
      {items.map(({ id, caption }, index) => (
        <figure {...stylex.props(styles.figure)}>
          {id === "heph-demo" ? (
            <Island name="heph" component={Terminal} props={{}} />
          ) : (
            <Image id={id} grid={grid} eager={eager && index === 0} />
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
  const tokens: Token[] = language === "toml" ? toml(code) : [[null, code]];
  return (
    <div {...stylex.props(styles.column, styles.codeBlock)}>
      {title && (
        <p {...stylex.props(styles.small, styles.codeLabel)}>
          <Inline text={title} />
        </p>
      )}
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
    </div>
  );
}

type Group = (Block & { type: "media" | "code" }) | Block[];

/** Splits a section into prose runs, which share one copy column, and standalone blocks. */
function group(blocks: Block[]): Group[] {
  const groups: Group[] = [];
  for (const block of blocks) {
    const previous = groups.at(-1);
    if (block.type === "media" || block.type === "code") groups.push(block);
    else if (Array.isArray(previous)) previous.push(block);
    else groups.push([block]);
  }
  return groups;
}

function Prose({ blocks, after }: { blocks: Block[]; after: Group | undefined }) {
  const spacing =
    after &&
    !Array.isArray(after) &&
    (after.type === "media" ? styles.afterMedia : styles.afterCode);
  return (
    <div {...stylex.props(styles.column, spacing)}>
      {blocks.map((block, index) =>
        block.type === "h2" ? (
          <h2 {...stylex.props(styles.h2)}>
            <Inline text={block.text} />
          </h2>
        ) : block.type === "h3" ? (
          <h3 {...stylex.props(styles.h3)}>
            <Inline text={block.text} />
          </h3>
        ) : block.type === "list" ? (
          <ul {...stylex.props(styles.list)}>
            {block.items.map((item, itemIndex) => (
              <li {...stylex.props(styles.prose, itemIndex > 0 && styles.nextItem)}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ) : (
          block.type === "p" && (
            <p
              {...stylex.props(
                styles.prose,
                ["p", "list"].includes(blocks[index - 1]?.type ?? "") && styles.nextParagraph,
              )}
            >
              <Inline text={block.text} />
            </p>
          )
        ),
      )}
    </div>
  );
}

/** Renders a case study; `eager` gives its first image high fetch priority. */
export function Article({ markdown, eager }: { markdown: string; eager: boolean }) {
  const { title, blocks } = parse(markdown);
  const firstMedia = blocks.find((block) => block.type === "media");
  // Each ## opens a section with a chapter-sized gap; content before the first ## is not wrapped.
  const sections: Block[][] = [[]];
  for (const block of blocks) {
    if (block.type === "h2") sections.push([]);
    sections.at(-1)?.push(block);
  }
  const render = (groups: Group[]) =>
    groups.map((item, index) =>
      Array.isArray(item) ? (
        <Prose blocks={item} after={groups[index - 1]} />
      ) : item.type === "media" ? (
        <Figures items={item.items} eager={eager && item === firstMedia} />
      ) : (
        <Code {...item} />
      ),
    );
  const [intro = [], ...chapters] = sections;
  return (
    <>
      <header {...stylex.props(styles.column)}>
        <h1 {...stylex.props(styles.title)}>
          <Inline text={title} />
        </h1>
      </header>
      {render(group(intro))}
      {chapters.map((chapter) => (
        <section {...stylex.props(styles.section)}>{render(group(chapter))}</section>
      ))}
    </>
  );
}

export const styles = stylex.create({
  column: { width: `min(100%, ${space.contentColumn})`, marginInline: "auto" },
  title: {
    maxWidth: space.contentColumn,
    margin: `0 0 ${space.caseTitleTextGap}`,
    fontSize: "19px",
    fontWeight: 500,
    lineHeight: "28px",
  },
  section: { marginTop: "80px" },
  h2: { marginBottom: "24px", fontSize: "24px", fontWeight: 500, lineHeight: "32px" },
  h3: { margin: "48px 0 12px", fontSize: "19px", fontWeight: 500, lineHeight: "28px" },
  prose: { color: colors.article, fontWeight: colors.proseWeight },
  nextParagraph: { marginTop: "32px" },
  list: { margin: "20px 0 0 20px" },
  nextItem: { marginTop: "8px" },
  link: {
    color: { default: colors.article, ":focus-visible": colors.primary },
    textDecorationLine: "underline",
    textDecorationColor: {
      default: colors.tertiary,
      ":hover": { "@media (hover: hover)": colors.primary },
    },
  },
  code: {
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "18px",
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: colors.codeBg,
    color: colors.primary,
  },
  strong: { color: colors.primary, fontWeight: 500 },
  small: { color: colors.tertiary, fontSize: "14px", lineHeight: "20px" },
  media: { width: "100%", marginTop: "24px" },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      "@media (max-width: 768px)": "1fr",
    },
    gap: "20px",
  },
  figure: { minWidth: 0 },
  image: {
    display: "block",
    width: "100%",
    height: "auto",
    borderRadius: space.mediaRadius,
    userSelect: "none",
    WebkitUserDrag: "none",
  },
  mark: { width: "88%", borderRadius: 0, filter: colors.artworkFilter },
  centered: { marginInline: "auto" },
  caption: { maxWidth: space.contentColumn, marginTop: "12px" },
  afterMedia: { marginTop: "48px" },
  afterCode: { marginTop: space.textMediaGap },
  codeBlock: { marginTop: space.textMediaGap },
  codeLabel: { marginBottom: "8px" },
  pre: {
    overflowX: "auto",
    color: colors.primary,
    fontSize: "14px",
    lineHeight: "20px",
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
