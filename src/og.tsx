import { readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { decompress } from "wawoff2";
import { contacts, email, person, profiles, projects } from "./site.ts";
import { colors, figureUnits, space } from "./tokens.stylex.ts";

/**
 * The link-preview image: the desktop homepage as it first appears, drawn at build time. The
 * layout is laid out in the page's own CSS pixels, from the page's tokens, content and font, and
 * scaled to the 1200 × 630 frame link previews use; like a screenshot, the frame crops what does
 * not fit. Only what the page shows without interaction is drawn (no hover, no toggle).
 */

/** The frame link previews use (1.91:1). */
export const shareFrame = { width: 1200, height: 630 } as const;
/** Desktop `rem` values resolve against the browser's default root size. */
const rootFontSize = 16;

/** A token's default value: the first declaration of its variable in the built CSS. */
function tokens(css: string) {
  return (token: string): string => {
    const name = token.match(/^var\((--[\w-]+)\)$/)?.[1];
    if (name === undefined) throw new Error(`Not a CSS variable: ${token}`);
    const value = css.match(new RegExp(`${name}:([^;}]+)`))?.[1];
    if (value === undefined) throw new Error(`No value for ${name} in the built CSS.`);
    return value.trim();
  };
}

/** Resolves a length in px, rem or `calc()` arithmetic of them to CSS pixels. */
function px(length: string): number {
  const parts = length.replace(/^calc/, "").match(/\d*\.?\d+(?:px|rem)?|[()+\-*/]/g) ?? [];
  let index = 0;
  const factor = (): number => {
    const part = parts[index++];
    if (part === "(") {
      const value = sum();
      if (parts[index++] !== ")") throw new Error(`Unbalanced length: ${length}`);
      return value;
    }
    if (part === "-") return -factor();
    const number = part === undefined ? Number.NaN : Number.parseFloat(part);
    if (Number.isNaN(number)) throw new Error(`Unsupported length: ${length}`);
    return part?.endsWith("rem") ? number * rootFontSize : number;
  };
  const product = (): number => {
    let value = factor();
    while (parts[index] === "*" || parts[index] === "/") {
      const operator = parts[index++];
      const operand = factor();
      if (operator === "/" && operand === 0) throw new Error(`Division by zero: ${length}`);
      value = operator === "*" ? value * operand : value / operand;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (parts[index] === "+" || parts[index] === "-") {
      const operator = parts[index++];
      const operand = product();
      value = operator === "+" ? value + operand : value - operand;
    }
    return value;
  };
  const value = sum();
  if (index !== parts.length) throw new Error(`Unsupported length: ${length}`);
  return value;
}

/**
 * `oklch(L C H / alpha)` in sRGB, which the rasterizer understands. The matrices are OKLab's
 * (Björn Ottosson, 2020), from OKLCH through linear LMS and linear sRGB.
 */
function srgb(color: string): string {
  const match = color.match(
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/,
  );
  if (!match) throw new Error(`Unsupported color: ${color}`);
  const [, lightness = "", lightnessPercent, chroma = "", hue = "", alpha, alphaPercent] = match;
  const l = Number(lightness) / (lightnessPercent ? 100 : 1);
  const c = Number(chroma);
  const h = (Number(hue) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channel = (linear: number) => {
    const clamped = Math.min(1, Math.max(0, linear));
    const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  };
  const red = channel(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short);
  const green = channel(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short);
  const blue = channel(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short);
  const opacity = alpha === undefined ? 1 : Number(alpha) / (alphaPercent ? 100 : 1);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function units(value: string): number {
  const number = Number(value);
  if (Number.isNaN(number)) throw new Error(`Not a number of font units: ${value}`);
  return number;
}

/** A date spaced as `Figures` spaces it on the page: tabular cells, tracked; hyphens adjusted. */
function IsoDate({ text }: { text: string }) {
  const em = (value: string) => `${units(value) / units(figureUnits.unitsPerEm)}em`;
  const characters = text.match(/[\d-]/g) ?? [];
  if (characters.join("") !== text) throw new Error(`Not an ISO date: ${text}`);
  return (
    <div style={{ display: "flex" }}>
      {characters.map((character) =>
        character === "-" ? (
          <span
            style={{
              marginLeft: em(figureUnits.beforeHyphen),
              marginRight: em(figureUnits.afterHyphen),
            }}
          >
            -
          </span>
        ) : (
          <span
            style={{
              display: "flex",
              justifyContent: "center",
              width: em(figureUnits.tabular),
              marginRight: em(figureUnits.digit),
            }}
          >
            {character}
          </span>
        ),
      )}
    </div>
  );
}

function Page({ css }: { css: string }) {
  const token = tokens(css);
  const length = (value: string) => px(token(value));
  const color = (value: string) => srgb(token(value));
  const line = length(space.linkLineHeight);
  const inset = length(space.pageInset);
  const rowPadding = length(space.portfolioRowPadding);
  const pitch = length(space.sidebarBaselinePitch);
  const linkGap = length(space.linkGap);
  const tableGap = length(space.tableGap);
  const hairline = color(colors.hairline);
  const text = { fontSize: rootFontSize, lineHeight: `${line}px` };
  const header = line + rowPadding;
  const row = line + rowPadding * 2;
  const link = (label: string) => (
    <span style={{ ...text, color: color(colors.tertiary) }}>{`${label} ↗`}</span>
  );
  // One column per table column, so each takes its widest cell as on the page. The scope column
  // takes the remaining width; the arrow column sets its cells flush right.
  const column = (
    head: preact.ComponentChildren,
    cells: preact.ComponentChildren[],
    fit: "content" | "grow" | "end",
  ) => {
    const cell = {
      display: "flex",
      ...(fit === "end" && { justifyContent: "flex-end" }),
      ...text,
    };
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          ...(fit === "grow" ? { flexGrow: 1, minWidth: 0 } : { flexShrink: 0 }),
        }}
      >
        <div style={{ ...cell, height: header, color: color(colors.secondary) }}>{head}</div>
        {cells.map((content) => (
          <div style={{ ...cell, height: row, paddingTop: rowPadding }}>{content}</div>
        ))}
      </div>
    );
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: `${inset}px ${inset}px 0`,
        backgroundColor: color(colors.bg),
        color: color(colors.primary),
        fontFamily: "Inter",
      }}
    >
      {/* Intro: the name beside the About line, as tall as the taller of the two. */}
      <div
        style={{
          display: "flex",
          gap: length(space.layoutGap),
          marginBottom: length(space.textMediaGap),
        }}
      >
        <div
          style={{
            display: "flex",
            width: length(space.sidebarColumn),
            fontSize: 19,
            letterSpacing: "-0.02em",
            lineHeight: `${line}px`,
          }}
        >
          {person.name}
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", width: length(space.contentColumn) }}
        >
          <span
            style={{
              ...text,
              color: color(colors.secondary),
              marginBottom: length(space.sectionContentGap),
            }}
          >
            About
          </span>
          <span style={text}>{person.summary}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: length(space.layoutGap) }}>
        {/* Sidebar: contact, then profiles, on the sidebar pitch. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: length(space.sidebarColumn),
            gap: linkGap,
          }}
        >
          <span style={{ ...text, color: color(colors.secondary) }}>Contact</span>
          <span style={{ ...text, color: color(colors.tertiary) }}>{email}</span>
          {contacts.map(({ label }) => link(label))}
          <span style={{ ...text, color: color(colors.secondary), marginTop: pitch }}>Links</span>
          {profiles.map(({ label }) => link(label))}
        </div>
        {/* Table, hairlines drawn inside each row as on the page. */}
        <div
          style={{
            display: "flex",
            position: "relative",
            width: length(space.contentColumn),
            gap: tableGap,
          }}
        >
          {/* Under the header, and at the top of every row after the first. */}
          {[header - 1, ...projects.slice(1).map((_, index) => header + (index + 1) * row)].map(
            (top) => (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top,
                  height: 1,
                  backgroundColor: hairline,
                }}
              />
            ),
          )}
          {column(
            "Date\u00a0↓",
            projects.map(({ date }) => (
              <span style={{ color: color(colors.tertiary) }}>
                <IsoDate text={date} />
              </span>
            )),
            "content",
          )}
          {column(
            "Project",
            projects.map(({ title }) => <span>{title}</span>),
            "content",
          )}
          {column(
            "Scope",
            projects.map(({ scope }) => (
              <span
                style={{
                  color: color(colors.tertiary),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {scope}
              </span>
            )),
            "grow",
          )}
          {column(
            "All",
            projects.map(({ external }) => (
              <span
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: length(space.arrowWidth),
                  color: color(colors.tertiary),
                }}
              >
                {external ? "↗" : "→"}
              </span>
            )),
            "end",
          )}
        </div>
      </div>
    </div>
  );
}

/** Renders the preview as PNG bytes. `css` is the site's built stylesheet, for its tokens. */
const variationTables = new Set(["fvar", "gvar", "avar", "HVAR", "MVAR", "STAT"]);

/**
 * The font without its variation tables: its default instance, Inter at weight 400 and optical
 * size 14, which is the page's text weight. Satori's font parser cannot read variable fonts.
 */
function defaultInstance(font: Uint8Array): Buffer {
  const source = Buffer.from(font);
  const tables = Array.from({ length: source.readUInt16BE(4) }, (_, index) => {
    const record = 12 + index * 16;
    return {
      tag: source.toString("latin1", record, record + 4),
      body: source.subarray(
        source.readUInt32BE(record + 8),
        source.readUInt32BE(record + 8) + source.readUInt32BE(record + 12),
      ),
    };
  }).filter(({ tag }) => !variationTables.has(tag));
  // An sfnt: version, table count, then one 16-byte record per table, bodies 4-byte aligned.
  const directory = Buffer.alloc(12 + tables.length * 16);
  source.copy(directory, 0, 0, 4);
  directory.writeUInt16BE(tables.length, 4);
  const bodies: Buffer[] = [];
  let offset = directory.length;
  for (const [index, { tag, body }] of tables.entries()) {
    const record = 12 + index * 16;
    directory.write(tag, record, "latin1");
    directory.writeUInt32BE(offset, record + 8);
    directory.writeUInt32BE(body.length, record + 12);
    const aligned = Buffer.alloc(Math.ceil(body.length / 4) * 4);
    body.copy(aligned);
    bodies.push(aligned);
    offset += aligned.length;
  }
  return Buffer.concat([directory, ...bodies]);
}

export async function ogImage(css: string): Promise<Uint8Array> {
  // Inter with the page's case forms built in (scripts/inter.py), since satori cannot turn them on.
  const font = defaultInstance(await decompress(readFileSync("src/fonts/inter-share.woff2")));
  const token = tokens(css);
  // The page's own width: the layout plus its inset on both sides; the height follows the frame.
  const width =
    px(token(space.sidebarColumn)) +
    px(token(space.layoutGap)) +
    px(token(space.contentColumn)) +
    px(token(space.pageInset)) * 2;
  const svg = await satori(<Page css={css} />, {
    width,
    height: (width * shareFrame.height) / shareFrame.width,
    fonts: [{ name: "Inter", data: font, weight: 400, style: "normal" }],
  });
  return new Resvg(svg, {
    fitTo: { mode: "width", value: shareFrame.width },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
}
