import * as stylex from "@stylexjs/stylex";
import { useId } from "preact/hooks";
import type { Project } from "./site.ts";
import {
  colors,
  descriptorMarker,
  fade,
  media,
  rowMarker,
  space,
  typeScale,
} from "./tokens.stylex.ts";
import { Figures, ui, untranslated } from "./ui.tsx";

/**
 * One project in a three-column subgrid. The parent grid owns the columns; `home` rows live in
 * the homepage table, the others in the case pages' next-project lists, and both look the same:
 * no glyph, the row under the pointer or in focus brightens (`ui.respond`). A row that leaves the
 * site underlines its title, as the article links do. Every row: the title, a short noun phrase,
 * and a fact set right, closing the row on its right edge.
 * - Projects: what it is (`descriptor`) and where it runs (`platform`). No date: what it does
 *   matters, not when it started.
 * - Design: what was made (`work`) and the date.
 * Named by what it shows; the full `description` describes it.
 */
export function Row({ project, first, home }: { project: Project; first: boolean; home: boolean }) {
  const Title = home ? "h4" : "span";
  const id = useId();
  const { group } = project;
  return (
    <a
      {...stylex.props(
        rowMarker,
        ui.respond,
        styles.row,
        !first && styles.divided,
        !home && styles.next,
      )}
      href={project.href}
      // Named by what it shows, in reading order; the full sentence describes it.
      aria-labelledby={`${id}-title ${id}-descriptor ${id}-end`}
      aria-describedby={`${id}-description`}
    >
      <Title
        {...stylex.props(
          ui.text,
          styles.cell,
          styles.title,
          project.external && [ui.respond, ui.outbound],
        )}
        id={`${id}-title`}
        {...untranslated}
      >
        {project.title}
      </Title>
      <span
        {...stylex.props(
          ui.text,
          descriptorMarker,
          styles.descriptor,
          group.$ === "Projects" && styles.wideOnPhones,
        )}
        id={`${id}-descriptor`}
        data-descriptor
      >
        <span {...stylex.props(styles.track)}>
          {group.$ === "Design" ? group.work : project.descriptor}
        </span>
      </span>
      {group.$ === "Design" ? (
        <time
          {...stylex.props(ui.text, styles.cell, styles.date)}
          id={`${id}-end`}
          dateTime={project.date}
        >
          <Figures text={project.date.slice(0, 4)} />
          <span {...stylex.props(styles.monthDay)}>
            <Figures text={project.date.slice(4)} />
          </span>
        </time>
      ) : (
        <span
          {...stylex.props(ui.text, styles.cell, styles.date, styles.platform)}
          id={`${id}-end`}
        >
          {group.platform}
        </span>
      )}
      <span {...stylex.props(ui.srOnly)} id={`${id}-description`}>
        {project.description}
      </span>
    </a>
  );
}

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
    outlineOffset: space.focusOffset,
    borderRadius: { default: null, ":focus-visible": `calc(${space.radius} / 2)` },
  },
  // A hairline drawn inside the row, so it never adds to the row's height.
  divided: { boxShadow: `inset 0 1px ${colors.hairline}` },
  next: {
    paddingBottom: { default: null, ":last-child": { [media.desktop]: 0 } },
  },
  cell: {
    gridRow: 1,
    whiteSpace: "nowrap",
    paddingInlineEnd: { default: null, [media.mobile]: space.mobileCellEndSpace },
  },
  /**
   * Set right, as a ledger's figures: the digits line up into a column that closes the row, the
   * last figure on the row's right edge.
   */
  date: {
    gridColumn: 3,
    justifySelf: "end",
    position: "relative",
    display: "block",
    textAlign: "end",
    color: "inherit",
    paddingInlineEnd: 0,
  },
  /**
   * Phones show the year alone, so the description keeps its room; the month and day stay in the
   * row's accessible name (`aria-labelledby` reads hidden text) and in `dateTime`.
   */
  monthDay: { display: { default: "inline", [media.mobile]: "none" } },
  /** Where a project runs: desktop only; on a phone the descriptor takes its room. */
  platform: { display: { default: "block", [media.mobile]: "none" } },
  /** Phones: a project's descriptor takes the hidden platform's column too. */
  wideOnPhones: { gridColumn: { default: 2, [media.mobile]: "2 / -1" } },
  /** The thing named, at the emphasis weight; the descriptor and date beside it stay at the text's. */
  title: { gridColumn: 1, margin: 0, color: colors.primary, fontWeight: typeScale.emphasisWeight },
  descriptor: {
    gridColumn: 2,
    gridRow: 1,
    // A descriptor that still does not fit scrolls to its end, fades and starts over
    // (`descriptor.ts`); until then, or with motion reduced, it ellipsizes.
    minWidth: { default: null, [media.mobile]: 0 },
    overflow: { default: null, [media.mobile]: "hidden" },
    whiteSpace: { default: null, [media.mobile]: "nowrap" },
    textOverflow: {
      default: null,
      [media.mobile]: "ellipsis",
      ":is([data-marquee])": { [media.motion]: "clip" },
    },
    // While it scrolls, the text fades at both edges instead of being cut: on the right over the
    // last table gap, on the left over a unit reaching into the gap beside the title, so the
    // text's resting place does not move.
    maskImage: {
      default: null,
      ":is([data-marquee])": { [media.motion]: fade.both },
    },
    marginInlineStart: {
      default: null,
      ":is([data-marquee])": { [media.motion]: `calc(-1 * ${space.unit})` },
    },
    paddingInlineStart: {
      default: null,
      ":is([data-marquee])": { [media.motion]: space.unit },
    },
    // The row's own colour (grey, full contrast on its hover or focus), inherited, so the subject
    // fades with the row on leaving; a colour of its own here would switch at once.
    color: "inherit",
  },
  /**
   * A descriptor wider than its cell (`descriptor.ts` sets `data-marquee` and runs the round):
   * the text as one box, so it can move as one. Motion reduced, it never moves and stays
   * ellipsized.
   */
  track: {
    display: {
      default: "inline",
      [stylex.when.ancestor("[data-marquee]", descriptorMarker)]: {
        default: "inline",
        [media.motion]: "inline-block",
      },
    },
  },
});
