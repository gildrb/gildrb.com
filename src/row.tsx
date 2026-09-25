import * as stylex from "@stylexjs/stylex";
import type { Project } from "./site.ts";
import { colors, media, rowMarker, space } from "./tokens.stylex.ts";
import { Figures, type Style, ui, untranslated } from "./ui.tsx";

/**
 * One project in a four-column subgrid (date, title, scope, arrow). The parent grid owns
 * the columns; `home` rows live in the homepage table, the others in "View next" lists.
 */
export function Row({
  project,
  first,
  home,
  style,
  delay,
}: {
  project: Project;
  first: boolean;
  home: boolean;
  style?: Style;
  /** Entry-animation delay, see `entry.ts`. */
  delay?: string;
}) {
  const Title = home ? "h3" : "span";
  return (
    <a
      {...stylex.props(
        rowMarker,
        styles.row,
        !first && styles.divided,
        home ? styles.home : styles.next,
        style,
      )}
      href={project.href}
      style={delay && { "--entry-delay": delay }}
    >
      <time {...stylex.props(ui.text, styles.cell, styles.date)} dateTime={project.date}>
        <span {...stylex.props(home ? styles.fullHome : styles.fullNext)}>
          <Figures text={project.date} />
        </span>
        <span {...stylex.props(home ? styles.yearHome : styles.yearNext)}>
          <Figures text={project.date.slice(0, 7)} />
        </span>
      </time>
      <Title {...stylex.props(ui.text, styles.cell, styles.title)} {...untranslated}>
        {project.title}
      </Title>
      <span {...stylex.props(ui.text, styles.scope)}>{project.scope}</span>
      <span {...stylex.props(ui.text, ui.sans, styles.arrow)} aria-hidden="true">
        <span {...stylex.props(styles.view, home ? styles.viewHome : styles.viewNext)}>
          {project.external ? "Visit" : "View"}
        </span>
        <span {...stylex.props(styles.glyph)}>{project.external ? "↗" : "→"}</span>
      </span>
    </a>
  );
}

const narrowTable = "@container (max-width: 25rem)";

const styles = stylex.create({
  row: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    alignItems: "baseline",
    width: "100%",
    // Phones: one touch target per row. Desktop: 2.5rem, the pitch the sidebar is aligned to.
    paddingBlock: { default: space.touchInset, [media.desktop]: space.portfolioRowPadding },
    // A press raises the row like hover does (the grey tap flash is off, see `layout.tsx`).
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
      ":active": colors.primary,
    },
    textDecoration: "none",
    touchAction: "manipulation",
    userSelect: "none",
    outline: { default: null, ":focus-visible": `1px solid ${colors.primary}` },
  },
  // A hairline drawn inside the row, so it never adds to the row's height.
  divided: { boxShadow: `inset 0 1px ${colors.hairline}` },
  home: {
    borderRadius: { default: "4px", [media.desktop]: 0, ":focus-visible": "2px" },
    outlineOffset: "6px",
  },
  next: {
    outlineOffset: "4px",
    paddingBottom: { default: null, ":last-child": { [media.desktop]: 0 } },
  },
  cell: {
    gridRow: 1,
    whiteSpace: "nowrap",
    paddingInlineEnd: { default: null, [media.mobile]: space.mobileCellEndSpace },
  },
  date: { gridColumn: 1, display: "block", color: "inherit" },
  fullHome: { display: { default: null, [media.mobile]: "none", [narrowTable]: "none" } },
  yearHome: {
    display: { default: "none", [media.mobile]: "inline", [narrowTable]: "inline" },
  },
  fullNext: { display: { default: null, "@media (max-width: 768px)": "none" } },
  yearNext: { display: { default: "none", "@media (max-width: 768px)": "inline" } },
  title: { gridColumn: 2, margin: 0, color: colors.primary },
  scope: {
    gridColumn: 3,
    gridRow: 1,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    color: {
      default: colors.tertiary,
      [stylex.when.ancestor(":hover", rowMarker)]: { [media.hover]: colors.primary },
      [stylex.when.ancestor(":focus-visible", rowMarker)]: colors.primary,
      [stylex.when.ancestor(":active", rowMarker)]: colors.primary,
    },
  },
  arrow: {
    gridColumn: 4,
    gridRow: 1,
    alignSelf: "baseline",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
  },
  glyph: { flexShrink: 0, width: space.arrowWidth, textAlign: "center" },
  view: {
    visibility: {
      default: "hidden",
      [stylex.when.ancestor(":hover", rowMarker)]: { [media.hover]: "visible" },
      [stylex.when.ancestor(":focus-visible", rowMarker)]: "visible",
    },
  },
  viewHome: { display: { default: null, [media.mobile]: "none", [narrowTable]: "none" } },
  viewNext: { display: { default: null, "@media (max-width: 768px)": "none" } },
});
