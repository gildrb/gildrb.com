import * as stylex from "@stylexjs/stylex";
import type { TargetedMouseEvent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { Row } from "../row.tsx";
import { compareRows, projects, type SortDirection, type SortKey } from "../site.ts";
import { colors, media, rootMarker, rowMarker, space } from "../tokens.stylex.ts";
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
 * the subject is plain text. The archive
 * is the table's footer, whatever the order: "Archive" in the project column, the count in the subject column. Edge fades show while the list scrolls on phones.
 * One square marks the row under the pointer or in focus, in the column where other lists show →;
 * it smears from row to row as the Contents square does and leaves with the pointer (`rows.ts`).
 */
export function Portfolio({ more }: { more: number }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "date",
    direction: "descending",
  });
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const section = useRef<HTMLElement>(null);

  // Browsers with scroll-driven animations tie the edge fades to the scroll position in CSS, so
  // they are right from the first frame; this fallback only serves the others.
  useEffect(() => {
    const element = section.current;
    if (!element || CSS.supports("animation-timeline: scroll()")) return undefined;
    const update = () =>
      setEdges({
        top: element.scrollTop > 1,
        bottom: element.scrollHeight - element.clientHeight - element.scrollTop > 1,
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, []);

  function select(key: SortKey, event: TargetedMouseEvent<HTMLButtonElement>) {
    const direction =
      sort.key === key && sort.direction === "descending" ? "ascending" : "descending";
    setSort({ key, direction });
    announce(`Projects sorted by ${key}, ${describe(key, direction)}.`);
    if (event.detail !== 0) event.currentTarget.blur();
  }

  const rows = projects.toSorted(compareRows(sort.key, sort.direction));
  return (
    <div
      {...stylex.props(
        styles.frame,
        edges.top && styles.fadeTop,
        edges.bottom && styles.fadeBottom,
      )}
    >
      <table {...stylex.props(ui.text, ui.sans, styles.header)} aria-label="Project columns">
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
      <section
        data-scroll-list
        ref={section}
        {...stylex.props(styles.section)}
        aria-labelledby="portfolio-title"
      >
        <h2 {...stylex.props(ui.srOnly)} id="portfolio-title">
          Projects
        </h2>
        <div data-rows {...stylex.props(styles.list)}>
          <span {...stylex.props(styles.marker)} data-row-square aria-hidden="true" />
          {rows.map((project, index) => (
            <Row key={project.href} project={project} first={index === 0} home />
          ))}
          <a
            {...stylex.props(rowMarker, styles.archive)}
            href={`/all?sort=${sort.key}&direction=${sort.direction}`}
          >
            <span {...stylex.props(ui.text, styles.title)}>Archive</span>
            <span {...stylex.props(ui.text, styles.more)}>
              <Figures text={String(more)} /> more
            </span>
            <span {...stylex.props(ui.text, styles.archiveGlyph)} aria-hidden="true" data-row-mark>
              {"\u00a0"}
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}

const scrollDriven = "@supports (animation-timeline: scroll())";

// Scroll-linked: the top fade appears once the list scrolls, the bottom one leaves at the end.
const revealTop = stylex.keyframes({ "0%": { opacity: 0 }, "4%, 100%": { opacity: 1 } });
const hideBottom = stylex.keyframes({ "0%, 96%": { opacity: 1 }, "100%": { opacity: 0 } });

const styles = stylex.create({
  frame: {
    display: "grid",
    gridTemplateColumns: space.projectColumns,
    // Dense desktop viewports (see `align.ts`) borrow the phone layout: the list scrolls under
    // the header, between edge fades.
    gridTemplateRows: {
      default: null,
      [media.mobile]: "auto minmax(0, 1fr)",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: {
        [media.desktop]: "auto minmax(0, 1fr)",
      },
    },
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    gridRow: { default: null, [media.mobile]: 3, [media.desktop]: 2 },
    alignSelf: {
      default: null,
      [media.desktop]: "start",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "stretch" },
    },
    columnGap: { default: space.tableGap, [media.mobile]: space.mobileTableGap },
    containerType: "inline-size",
    position: {
      default: null,
      [media.mobile]: "relative",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "relative" },
    },
    minHeight: {
      default: null,
      [media.mobile]: 0,
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: 0 },
    },
    marginBottom: {
      default: "32px",
      [media.mobile]: space.sectionGap,
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: 0 },
    },
    timelineScope: "--portfolio",
    "::before": {
      content: {
        default: null,
        [media.mobile]: '""',
        [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: '""' },
      },
      // Just below the header: one touch target on phones.
      top: {
        default: space.touchTarget,
        [stylex.when.ancestor("[data-dense]", rootMarker)]: {
          [media.desktop]: `calc(${space.linkLineHeight} + ${space.portfolioRowPadding})`,
        },
      },
      backgroundImage: `linear-gradient(to bottom, ${colors.bg}, transparent)`,
      opacity: 0,
      position: "absolute",
      insetInline: 0,
      zIndex: 2,
      height: "56px",
      pointerEvents: "none",
      animationName: { default: null, [scrollDriven]: revealTop },
      animationTimeline: "--portfolio",
      animationTimingFunction: "linear",
      animationFillMode: "both",
    },
    "::after": {
      content: {
        default: null,
        [media.mobile]: '""',
        [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: '""' },
      },
      bottom: 0,
      backgroundImage: `linear-gradient(to top, ${colors.bg}, transparent)`,
      opacity: "var(--list-overflows, 0)",
      position: "absolute",
      insetInline: 0,
      zIndex: 2,
      height: "56px",
      pointerEvents: "none",
      animationName: { default: null, [scrollDriven]: hideBottom },
      animationTimeline: "--portfolio",
      animationTimingFunction: "linear",
      animationFillMode: "both",
    },
  },
  fadeTop: { "::before": { opacity: 1 } },
  fadeBottom: { "::after": { opacity: 1 } },
  header: {
    display: "grid",
    gridColumn: "1 / -1",
    gridRow: {
      default: null,
      [media.mobile]: 1,
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: 1 },
    },
    gridTemplateColumns: "subgrid",
    alignItems: "baseline",
    paddingBlock: { default: space.touchInset, [media.desktop]: `0 ${space.portfolioRowPadding}` },
    position: { default: null, [media.mobile]: "relative" },
    zIndex: { default: null, [media.mobile]: 3 },
    backgroundColor: { default: null, [media.mobile]: colors.bg },
    color: colors.secondary,
    // A hairline drawn inside the header, so it never adds to the header's height.
    boxShadow: `inset 0 -1px ${colors.hairline}`,
  },
  /** The sorted column reads full contrast, the other stays grey and lights on hover. */
  sort: {
    gridRow: 1,
    justifySelf: "start",
    color: {
      default: colors.secondary,
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
  /** The table's footer: "Archive" under the projects, the count under the subjects, the row square's place at the right end. */
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
    borderRadius: { default: "4px", [media.desktop]: 0, ":focus-visible": "2px" },
    outline: { default: null, ":focus-visible": `1px solid ${colors.primary}` },
    outlineOffset: "6px",
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
  archiveGlyph: { gridColumn: 4, width: space.arrowWidth, textAlign: "center" },
  section: {
    display: {
      default: "grid",
      [media.desktop]: "contents",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "grid" },
    },
    gridTemplateColumns: "subgrid",
    gridColumn: "1 / -1",
    gridRow: {
      default: null,
      [media.mobile]: 2,
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: 2 },
    },
    minWidth: 0,
    minHeight: {
      default: null,
      [media.mobile]: 0,
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: 0 },
    },
    alignContent: "start",
    overflowY: {
      default: null,
      [media.mobile]: "auto",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "auto" },
    },
    scrollbarWidth: "none",
    // The list scrolls inside a page that does not: reaching its end must not drag the page.
    overscrollBehavior: "contain",
    scrollTimeline: "--portfolio y",
    paddingBottom: {
      default: null,
      [media.mobile]: "8px",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "8px" },
    },
    "::-webkit-scrollbar": { display: "none" },
  },
  list: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    position: "relative",
  },
  /**
   * The row square: the Contents square's size and colour (`aside.tsx`). Hidden until a row is
   * pointed at or focused; decorative, so it never takes a pointer.
   */
  marker: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
    transformOrigin: "0 0",
    width: "8px",
    height: "6px",
    backgroundColor: colors.primary,
    opacity: 0,
    transitionProperty: "opacity",
    transitionDuration: "0.2s",
    pointerEvents: "none",
  },
});
