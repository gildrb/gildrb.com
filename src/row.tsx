import * as stylex from "@stylexjs/stylex";
import { useId } from "preact/hooks";
import type { Project } from "./site.ts";
import { colors, media, rowMarker, space } from "./tokens.stylex.ts";
import { Figures, type Style, ui, untranslated } from "./ui.tsx";

/**
 * One project in a four-column subgrid (date, title, scope, arrow). The parent grid owns
 * the columns; `home` rows live in the homepage table, the others in "View next" lists.
 * The link is named by the project and described by its date and scope; the short date and the
 * "View →" cue are visual only.
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
  const id = useId();
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
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-date ${id}-scope`}
      style={delay && { "--entry-delay": delay }}
    >
      <time
        {...stylex.props(ui.text, styles.cell, styles.date)}
        id={`${id}-date`}
        dateTime={project.date}
      >
        <span {...stylex.props(home ? styles.fullHome : styles.fullNext)}>
          <Figures text={project.date} />
        </span>
        <span
          {...stylex.props(home ? styles.shortHome : styles.shortNext)}
          aria-hidden="true"
          data-nosnippet
        >
          <Figures text={project.date.slice(0, 7)} />
        </span>
      </time>
      <Title
        {...stylex.props(ui.text, styles.cell, styles.title)}
        id={`${id}-title`}
        {...untranslated}
      >
        {project.title}
      </Title>
      <span {...stylex.props(ui.text, styles.scope)} id={`${id}-scope`}>
        {project.scope}
      </span>
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
const phoneNext = "@media (max-width: 768px)";

const styles = stylex.create({
  row: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    alignItems: "baseline",
    width: "100%",
    // Phones: one touch target per row. Desktop: 2.5rem, the pitch the sidebar is aligned to.
    paddingBlock: { default: space.touchInset, [media.desktop]: space.portfolioRowPadding },
    // Only hover (where there is hover) and keyboard focus raise the row; a finger's press
    // does not (the grey tap flash is off too, see `layout.tsx`).
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
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
  date: { gridColumn: 1, position: "relative", display: "block", color: "inherit" },
  /** The full date stays readable to assistive tech where the short one shows instead. */
  fullHome: {
    position: { default: null, [media.mobile]: "absolute", [narrowTable]: "absolute" },
    width: { default: null, [media.mobile]: "1px", [narrowTable]: "1px" },
    height: { default: null, [media.mobile]: "1px", [narrowTable]: "1px" },
    overflow: { default: null, [media.mobile]: "hidden", [narrowTable]: "hidden" },
    clipPath: { default: null, [media.mobile]: "inset(50%)", [narrowTable]: "inset(50%)" },
  },
  shortHome: {
    display: { default: "none", [media.mobile]: "inline", [narrowTable]: "inline" },
  },
  fullNext: {
    position: { default: null, [phoneNext]: "absolute" },
    width: { default: null, [phoneNext]: "1px" },
    height: { default: null, [phoneNext]: "1px" },
    overflow: { default: null, [phoneNext]: "hidden" },
    clipPath: { default: null, [phoneNext]: "inset(50%)" },
  },
  shortNext: { display: { default: "none", [phoneNext]: "inline" } },
  title: { gridColumn: 2, margin: 0, color: colors.primary },
  scope: {
    gridColumn: 3,
    gridRow: 1,
    // Phones are too narrow for the longest pair beside a full row; it ellipsizes there.
    minWidth: { default: null, [media.mobile]: 0 },
    overflow: { default: null, [media.mobile]: "hidden" },
    whiteSpace: { default: null, [media.mobile]: "nowrap" },
    textOverflow: { default: null, [media.mobile]: "ellipsis" },
    color: {
      default: colors.tertiary,
      [stylex.when.ancestor(":hover", rowMarker)]: { [media.hover]: colors.primary },
      [stylex.when.ancestor(":focus-visible", rowMarker)]: colors.primary,
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
