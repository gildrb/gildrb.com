import * as stylex from "@stylexjs/stylex";
import type { TargetedMouseEvent } from "preact";
import { useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { Row } from "../row.tsx";
import { compareRows, projects, type SortDirection, type SortKey } from "../site.ts";
import { colors, media, rowMarker, space } from "../tokens.stylex.ts";
import { Figures, ui } from "../ui.tsx";

const columns = [
  { key: "title", label: "Project" },
  { key: "date", label: "Date" },
] as const satisfies readonly { key: SortKey; label: string }[];

function describe(key: SortKey, direction: SortDirection): string {
  if (key === "date") return direction === "ascending" ? "oldest first" : "newest first";
  return direction === "descending" ? "A to Z" : "Z to A";
}

/**
 * The homepage project table: project, subject, then the date set right. Project and date sort,
 * the subject is plain text. The archive is the table's footer, whatever the order: "Archive" in
 * the project column, the count in the subject column. The row under the pointer or in focus
 * brightens; nothing else appears. Phones drop the last column, and the date ends at the table's
 * right edge.
 */
export function Portfolio({ more }: { more: number }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "date",
    direction: "descending",
  });

  function select(key: SortKey, event: TargetedMouseEvent<HTMLButtonElement>) {
    const direction =
      sort.key === key && sort.direction === "descending" ? "ascending" : "descending";
    setSort({ key, direction });
    announce(`Projects sorted by ${key}, ${describe(key, direction)}.`);
    if (event.detail !== 0) event.currentTarget.blur();
  }

  const rows = projects.toSorted(compareRows(sort.key, sort.direction));
  return (
    <div {...stylex.props(styles.frame)}>
      <table {...stylex.props(ui.label, ui.sans, styles.header)} aria-label="Project columns">
        {/* The wrappers take no box, so the buttons stay on the subgrid. */}
        <thead {...stylex.props(styles.contents)}>
          <tr {...stylex.props(styles.contents)}>
            {columns.map(({ key, label }) => {
              const active = sort.key === key;
              return (
                <th
                  key={key}
                  {...stylex.props(styles.contents, styles.cellText)}
                  scope="col"
                  aria-sort={active ? sort.direction : undefined}
                >
                  <button
                    {...stylex.props(
                      stylex.defaultMarker(),
                      ui.target,
                      ui.reset,
                      ui.focusRing,
                      ui.respond,
                      styles.sort,
                      styles[key],
                      active && styles.active,
                    )}
                    type="button"
                    // Starts with the visible label, so voice control finds it by what it says.
                    aria-label={`${label}, sort projects by ${key}`}
                    onClick={(event) => select(key, event)}
                  >
                    {label}
                  </button>
                </th>
              );
            })}
            <th {...stylex.props(styles.contents, styles.cellText)} scope="col">
              <span {...stylex.props(styles.label, styles.descriptor)}>Subject</span>
            </th>
          </tr>
        </thead>
      </table>
      <section {...stylex.props(styles.section)} aria-labelledby="portfolio-title">
        <h2 {...stylex.props(ui.srOnly)} id="portfolio-title">
          Projects
        </h2>
        <div data-rows {...stylex.props(styles.list)}>
          {rows.map((project, index) => (
            <Row key={project.href} project={project} first={index === 0} home />
          ))}
          <a
            {...stylex.props(rowMarker, ui.respond, styles.archive)}
            href={`/all?sort=${sort.key}&direction=${sort.direction}`}
          >
            <span {...stylex.props(ui.text, ui.emphasis, styles.title)}>Archive</span>
            <span {...stylex.props(ui.text, ui.respond, styles.more)}>
              <Figures text={String(more)} /> more
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}

const styles = stylex.create({
  frame: {
    display: "grid",
    gridTemplateColumns: space.projectColumns,
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    gridRow: { default: null, [media.mobile]: 4 },
    columnGap: { default: space.tableGap, [media.mobile]: space.mobileTableGap },
    containerType: "inline-size",
    marginBottom: {
      default: space.textMediaGap,
      // Phones: above Safari's bottom bar too, which floats over the page.
      [media.mobile]: `calc(${space.sectionGap} + env(safe-area-inset-bottom))`,
    },
  },
  header: {
    display: "grid",
    gridColumn: "1 / -1",
    gridRow: { default: null, [media.mobile]: 1 },
    gridTemplateColumns: "subgrid",
    alignItems: "baseline",
    paddingBlock: { default: space.touchInset, [media.desktop]: `0 ${space.portfolioRowPadding}` },
    color: colors.tertiary,
    // A hairline drawn inside the header, so it never adds to the header's height.
    boxShadow: `inset 0 -1px ${colors.hairline}`,
  },
  /** The sorted column reads full contrast, the other stays grey and lights on hover. */
  sort: {
    gridRow: 1,
    justifySelf: "start",
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
    },
  },
  active: { color: colors.primary },
  title: { gridColumn: 1 },
  descriptor: { gridColumn: 2 },
  date: { gridColumn: 3, justifySelf: "end" },
  contents: { display: "contents" },
  /** Header cells read as the row's text, not bold and centred. */
  cellText: { fontWeight: "inherit", textAlign: "start" },
  label: { gridRow: 1, justifySelf: "start" },
  /** The table's footer: "Archive" under the projects, the count under the subjects. */
  archive: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    alignItems: "baseline",
    paddingBlock: { default: space.touchInset, [media.desktop]: space.portfolioRowPadding },
    boxShadow: `inset 0 1px ${colors.hairline}`,
    color: colors.primary,
    textDecoration: "none",
    touchAction: "manipulation",
    userSelect: "none",
    outline: { default: null, ":focus-visible": `1px solid ${colors.primary}` },
    outlineOffset: space.focusOffset,
    borderRadius: { default: null, ":focus-visible": `calc(${space.radius} / 2)` },
  },
  /** As a row's subject: dim until the footer is hovered or focused. */
  more: {
    gridColumn: 2,
    color: {
      default: colors.tertiary,
      [stylex.when.ancestor(":hover", rowMarker)]: { [media.hover]: colors.primary },
      [stylex.when.ancestor(":focus-visible", rowMarker)]: colors.primary,
    },
  },
  section: {
    display: { default: "grid", [media.desktop]: "contents" },
    gridTemplateColumns: "subgrid",
    gridColumn: "1 / -1",
    gridRow: { default: null, [media.mobile]: 2 },
    minWidth: 0,
    alignContent: "start",
  },
  list: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    position: "relative",
  },
});
