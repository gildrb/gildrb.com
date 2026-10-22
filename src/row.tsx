import * as stylex from "@stylexjs/stylex";
import { useId } from "preact/hooks";
import type { Project } from "./site.ts";
import { colors, media, rowMarker, descriptorMarker, space, underline } from "./tokens.stylex.ts";
import { Figures, ui, untranslated } from "./ui.tsx";

/**
 * One project in a four-column subgrid (title, descriptor, date set right, square or arrow). The parent grid owns
 * the columns; `home` rows live in the homepage table, the others in "View next" lists.
 * The link is named by its title, descriptor and date, and described by its description. A row
 * that leaves the site underlines its title, as the article links do; the others show →. Home rows
 * show no glyph: their cell is where the table's one square lands (`portfolio.tsx`). Phones show
 * no square, so there home rows drop the cell and the date closes the row.
 */
export function Row({ project, first, home }: { project: Project; first: boolean; home: boolean }) {
  const Title = home ? "h3" : "span";
  const id = useId();
  return (
    <a
      {...stylex.props(
        rowMarker,
        styles.row,
        !first && styles.divided,
        home ? styles.home : styles.next,
      )}
      href={project.href}
      // Named by what it shows, in reading order (title, descriptor, date); the sentence describes.
      aria-labelledby={`${id}-title ${id}-descriptor ${id}-date`}
      aria-describedby={`${id}-description`}
    >
      <Title
        {...stylex.props(ui.text, styles.cell, styles.title, project.external && styles.outbound)}
        id={`${id}-title`}
        {...untranslated}
      >
        {project.title}
      </Title>
      <span
        {...stylex.props(ui.text, descriptorMarker, styles.descriptor)}
        id={`${id}-descriptor`}
        data-descriptor
      >
        <span {...stylex.props(styles.track)}>
          <span data-descriptor-text>{project.descriptor}</span>
          <span {...stylex.props(styles.copy)} aria-hidden="true">
            {project.descriptor}
          </span>
        </span>
      </span>
      <time
        {...stylex.props(ui.text, styles.cell, styles.date, home && styles.homeDate)}
        id={`${id}-date`}
        dateTime={project.date}
      >
        <Figures text={project.date.slice(0, 7)} />
        <span {...stylex.props(home ? styles.dayHome : styles.dayNext)}>
          <Figures text={project.date.slice(7)} />
        </span>
      </time>
      <span {...stylex.props(ui.srOnly)} id={`${id}-description`}>
        {project.description}
      </span>
      <span
        {...stylex.props(ui.text, ui.sans, styles.arrow, home && styles.squareSlot)}
        aria-hidden="true"
      >
        {home ? (
          <span {...stylex.props(styles.glyph)} data-row-mark>
            {"\u00a0"}
          </span>
        ) : (
          !project.external && <span {...stylex.props(styles.glyph)}>→</span>
        )}
      </span>
    </a>
  );
}

const narrowTable = "@container (max-width: 25rem)";
const phoneNext = "@media (max-width: 768px)";

/** One round: rest a moment, then move left by one text and gap, where the copy takes over. */
const marquee = stylex.keyframes({
  "0%, 20%": { transform: "translateX(0)" },
  "100%": { transform: "translateX(calc(-1 * var(--marquee-distance)))" },
});

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
  /** Set right, as a ledger's figures: the digits line up into a column that closes the row. */
  date: {
    gridColumn: 3,
    justifySelf: "end",
    position: "relative",
    display: "block",
    textAlign: "end",
    color: "inherit",
  },
  /** Home rows: on phones the date is the last cell, flush with the row's right edge. */
  homeDate: { paddingInlineEnd: 0 },
  /**
   * Narrow rows show the month; the day stays readable to assistive tech. The hidden day is pinned
   * inside the date: placed after the month, it would stand 1px past the row, which on phones is
   * the scrolling list's edge, and the list would scroll sideways.
   */
  dayHome: {
    position: { default: null, [media.mobile]: "absolute", [narrowTable]: "absolute" },
    insetInlineEnd: { default: null, [media.mobile]: 0, [narrowTable]: 0 },
    width: { default: null, [media.mobile]: "1px", [narrowTable]: "1px" },
    height: { default: null, [media.mobile]: "1px", [narrowTable]: "1px" },
    overflow: { default: null, [media.mobile]: "hidden", [narrowTable]: "hidden" },
    clipPath: { default: null, [media.mobile]: "inset(50%)", [narrowTable]: "inset(50%)" },
  },
  dayNext: {
    position: { default: null, [phoneNext]: "absolute" },
    width: { default: null, [phoneNext]: "1px" },
    height: { default: null, [phoneNext]: "1px" },
    overflow: { default: null, [phoneNext]: "hidden" },
    clipPath: { default: null, [phoneNext]: "inset(50%)" },
  },
  title: { gridColumn: 1, margin: 0, color: colors.primary },
  /** As `ui.outbound`, the underline raised with the row. */
  outbound: {
    textDecorationLine: "underline",
    textDecorationThickness: underline.thickness,
    textUnderlineOffset: underline.offset,
    textDecorationColor: {
      default: colors.tertiary,
      [stylex.when.ancestor(":hover", rowMarker)]: { [media.hover]: "currentColor" },
      [stylex.when.ancestor(":focus-visible", rowMarker)]: "currentColor",
    },
  },
  descriptor: {
    gridColumn: 2,
    gridRow: 1,
    // Phones are too narrow for the longest pair beside a full row. A descriptor that does not fit
    // runs past in a loop (`descriptor.ts`); until then, or with motion reduced, it ellipsizes.
    minWidth: { default: null, [media.mobile]: 0 },
    overflow: { default: null, [media.mobile]: "hidden" },
    whiteSpace: { default: null, [media.mobile]: "nowrap" },
    textOverflow: {
      default: null,
      [media.mobile]: "ellipsis",
      ":is([data-marquee])": { [media.motion]: "clip" },
    },
    // While it loops, the text fades in and out at the cell's right edge instead of being cut.
    maskImage: {
      default: null,
      ":is([data-marquee])": {
        [media.motion]: "linear-gradient(to right, black calc(100% - 16px), transparent)",
      },
    },
    color: {
      default: colors.tertiary,
      [stylex.when.ancestor(":hover", rowMarker)]: { [media.hover]: colors.primary },
      [stylex.when.ancestor(":focus-visible", rowMarker)]: colors.primary,
    },
  },
  /**
   * Phones, a descriptor wider than its cell (`descriptor.ts` sets `data-marquee` and the distance): the
   * text and a copy run left in a loop, one gap apart, resting a moment between rounds, so the
   * title keeps its room and the descriptor is read in full by waiting. Motion reduced, it stays
   * ellipsized.
   */
  track: {
    display: {
      default: "inline",
      [stylex.when.ancestor("[data-marquee]", descriptorMarker)]: {
        default: "inline",
        [media.motion]: "inline-flex",
      },
    },
    columnGap: "var(--marquee-gap, 0px)",
    animationName: {
      default: null,
      [stylex.when.ancestor("[data-marquee]", descriptorMarker)]: {
        default: null,
        [media.motion]: marquee,
      },
    },
    animationDuration: "var(--marquee-time, 0s)",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
  copy: {
    display: {
      default: "none",
      [stylex.when.ancestor("[data-marquee]", descriptorMarker)]: {
        default: "none",
        [media.motion]: "inline",
      },
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
  /** Home rows: phones show no square (`rows.ts`), so the slot goes and takes no column. */
  squareSlot: { display: { default: "inline-flex", [media.mobile]: "none" } },
  glyph: { flexShrink: 0, width: space.arrowWidth, textAlign: "center" },
});
