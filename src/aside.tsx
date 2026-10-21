import * as stylex from "@stylexjs/stylex";
import type { ComponentChildren } from "preact";
import type { Heading } from "./markdown.tsx";
import type { Case, Product } from "./site.ts";
import { colors, media, space } from "./tokens.stylex.ts";
import { type Style, ui } from "./ui.tsx";

/**
 * A project's facts as a small table, one fact per row: the year, who it is for, its scope and
 * where it lives. Every case study and product shows the same rows, in the same order.
 */
export function Facts({ item, style }: { item: Case | Product; style?: Style }) {
  const { credit, links } = item;
  const rows: [label: string, value: ComponentChildren][] = [
    ["Year", item.date.slice(0, 4)],
    [
      "For",
      credit.$ === "Self" ? (
        "Self-initiated"
      ) : credit.href === undefined ? (
        credit.name
      ) : (
        <a
          {...stylex.props(ui.focusRing, ui.outbound, styles.link)}
          href={credit.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {credit.name}
        </a>
      ),
    ],
    ["Scope", item.scope],
  ];
  if (links.length > 0)
    rows.push([
      "Links",
      <span {...stylex.props(styles.links)}>
        {links.map(({ label, href }) => (
          <a
            {...stylex.props(ui.focusRing, ui.outbound, styles.link)}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        ))}
      </span>,
    ]);
  return (
    <dl {...stylex.props(ui.text, styles.facts, style)}>
      {rows.map(([label, value], index) => (
        <div {...stylex.props(styles.row, index > 0 && styles.divided)}>
          <dt {...stylex.props(styles.label)}>{label}</dt>
          <dd {...stylex.props(styles.value)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The page's parts, to jump to. `contents.ts` marks the part being read and moves the square
 * beside it; without JavaScript the list still links every part.
 */
export function Contents({ parts }: { parts: readonly Heading[] }) {
  return (
    <nav {...stylex.props(ui.text, styles.contents)} aria-label="Contents" data-contents>
      <p {...stylex.props(styles.title)}>Contents</p>
      <div {...stylex.props(styles.track)}>
        <span {...stylex.props(styles.marker)} aria-hidden="true" data-contents-marker />
        <ol {...stylex.props(styles.list)}>
          {parts.map(({ id, text }) => (
            <li>
              <a {...stylex.props(ui.focusRing, styles.part)} href={`#${id}`}>
                {text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

/**
 * Wide screens' third column on a project or plain page: its facts and its contents, held in view
 * while the text scrolls beside it.
 */
export function Aside({ item, parts }: { item: Case | Product | null; parts: readonly Heading[] }) {
  return (
    <aside {...stylex.props(styles.aside)} aria-label="About this page">
      {item !== null && <Facts item={item} />}
      {parts.length > 0 && <Contents parts={parts} />}
    </aside>
  );
}

const styles = stylex.create({
  aside: {
    display: { default: "none", [media.wide]: "flex" },
    flexDirection: "column",
    gap: "48px",
    gridColumn: 3,
    gridRow: 1,
    alignSelf: "start",
    position: "sticky",
    top: 0,
    maxHeight: "100vh",
    overflowY: "auto",
    scrollbarWidth: "none",
    paddingBlock: space.pageInset,
    maxWidth: `${42 * 8}px`,
  },
  /** The first row's text on the page's first line, beside the opening sentence. */
  facts: { margin: 0, marginTop: "-4px" },
  row: {
    display: "grid",
    gridTemplateColumns: `${space.dateColumn} minmax(0, 1fr)`,
    columnGap: space.tableGap,
    paddingBlock: "4px",
  },
  /** A hairline drawn inside the row, like the homepage table's. */
  divided: { boxShadow: `inset 0 1px ${colors.hairline}` },
  label: { color: colors.tertiary },
  value: { margin: 0, color: colors.primary },
  links: { display: "flex", flexWrap: "wrap", columnGap: "16px" },
  link: {
    color: { default: colors.primary, ":hover": { [media.hover]: colors.secondary } },
    textDecoration: "none",
  },
  contents: { display: "flex", flexDirection: "column", gap: space.sectionContentGap },
  title: { color: colors.secondary },
  track: { position: "relative", paddingLeft: "16px" },
  list: {
    display: "flex",
    flexDirection: "column",
    rowGap: space.linkGap,
    listStyleType: "none",
  },
  /** The square beside the part being read; `contents.ts` moves it and shows it. */
  marker: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "6px",
    height: "6px",
    backgroundColor: colors.primary,
    opacity: 0,
  },
  part: {
    display: "block",
    textDecoration: "none",
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
      ":is([aria-current])": colors.primary,
    },
  },
});
