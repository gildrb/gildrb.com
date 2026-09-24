import * as stylex from "@stylexjs/stylex";
import type { TargetedMouseEvent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { announce } from "../announce.ts";
import { Row } from "../row.tsx";
import { compareRows, projects, type SortDirection, type SortKey } from "../site.ts";
import { colors, media, space } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";
import { entry } from "../entry.ts";

const columns = [
  { key: "date", label: "Date" },
  { key: "title", label: "Project" },
  { key: "scope", label: "Scope" },
] as const satisfies readonly { key: SortKey; label: string }[];

function describe(key: SortKey, direction: SortDirection): string {
  if (key === "date") return direction === "ascending" ? "oldest first" : "newest first";
  return direction === "descending" ? "A to Z" : "Z to A";
}

/** The homepage project table: sortable columns, and edge fades while the list scrolls on phones. */
export function Portfolio() {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "date",
    direction: "descending",
  });
  // Rows stagger in on load; once re-sorted they stay put instead of re-entering.
  const [sorted, setSorted] = useState(false);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
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
    setSorted(true);
    announce(`Projects sorted by ${key}, ${describe(key, direction)}.`);
    if (event.detail !== 0) event.currentTarget.blur();
  }

  const rows = [...projects].sort(compareRows(sort.key, sort.direction));
  return (
    <div
      {...stylex.props(
        styles.frame,
        entry.fade,
        edges.top && styles.fadeTop,
        edges.bottom && styles.fadeBottom,
      )}
    >
      <div
        {...stylex.props(ui.text, ui.sans, styles.header, entry.rise)}
        style={{ "--entry-delay": "120ms" }}
        aria-label="Project columns"
      >
        {columns.map(({ key, label }) => {
          const active = sort.key === key;
          return (
            <button
              {...stylex.props(ui.reset, ui.focusRing, styles.sort, styles[key])}
              type="button"
              data-scope-column={key === "scope" || undefined}
              aria-pressed={active}
              aria-label={`Sort projects by ${key}${active ? `, currently ${describe(key, sort.direction)}` : ""}`}
              onClick={(event) => select(key, event)}
            >
              <span>{label}&nbsp;</span>
              <span
                {...stylex.props(
                  ui.sans,
                  styles.indicator,
                  styles[`${key}Indicator`],
                  active && styles.visible,
                )}
                aria-hidden="true"
              >
                {active && sort.direction === "ascending" ? "↑" : "↓"}
              </span>
            </button>
          );
        })}
        <a
          {...stylex.props(ui.focusRing, styles.all)}
          href={`/all?sort=${sort.key}&direction=${sort.direction}`}
        >
          All
        </a>
      </div>
      <section ref={section} {...stylex.props(styles.section)} aria-labelledby="portfolio-title">
        <h2 {...stylex.props(ui.srOnly)} id="portfolio-title">
          Portfolio: case studies and projects by Gil Rodrigues, each linking to its full write-up
        </h2>
        <div {...stylex.props(styles.list)}>
          {rows.map((project, index) => (
            <Row
              key={project.href}
              project={project}
              first={index === 0}
              home
              style={!sorted && entry.rise}
              delay={`${165 + index * 45}ms`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

const styles = stylex.create({
  frame: {
    display: "grid",
    gridTemplateColumns: space.tableColumns,
    gridTemplateRows: { default: null, [media.mobile]: "auto minmax(0, 1fr)" },
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    gridRow: { default: null, [media.mobile]: 3, [media.desktop]: 2 },
    alignSelf: { default: null, [media.desktop]: "start" },
    columnGap: { default: space.tableGap, [media.mobile]: space.mobileTableGap },
    containerType: "inline-size",
    position: { default: null, [media.mobile]: "relative" },
    minHeight: { default: null, [media.mobile]: 0 },
    marginBottom: { default: "32px", [media.mobile]: space.sectionGap },
    "::before": {
      content: { default: null, [media.mobile]: '""' },
      top: "41px",
      backgroundImage: `linear-gradient(to bottom, ${colors.bg}, transparent)`,
      opacity: 0,
      position: "absolute",
      insetInline: 0,
      zIndex: 2,
      height: "56px",
      pointerEvents: "none",
      transition: "opacity 160ms ease-out",
    },
    "::after": {
      content: { default: null, [media.mobile]: '""' },
      bottom: 0,
      backgroundImage: `linear-gradient(to top, ${colors.bg}, transparent)`,
      opacity: 0,
      position: "absolute",
      insetInline: 0,
      zIndex: 2,
      height: "56px",
      pointerEvents: "none",
      transition: "opacity 160ms ease-out",
    },
  },
  fadeTop: { "::before": { opacity: 1 } },
  fadeBottom: { "::after": { opacity: 1 } },
  header: {
    display: "grid",
    gridColumn: "1 / -1",
    gridRow: { default: null, [media.mobile]: 1 },
    gridTemplateColumns: "subgrid",
    alignItems: "baseline",
    paddingBlock: { default: "8px", [media.desktop]: `0 ${space.portfolioRowPadding}` },
    position: { default: null, [media.mobile]: "relative" },
    zIndex: { default: null, [media.mobile]: 3 },
    backgroundColor: { default: null, [media.mobile]: colors.bg },
    color: colors.secondary,
    borderBottomWidth: { default: "1px", [media.desktop]: 0 },
    borderBottomStyle: "solid",
    borderBottomColor: colors.hairline,
    boxShadow: { default: null, [media.desktop]: `inset 0 -1px ${colors.hairline}` },
  },
  sort: {
    display: "inline-grid",
    gridTemplateColumns: "auto 1ch",
    alignItems: "baseline",
    justifySelf: "start",
  },
  date: { gridColumn: 1 },
  title: { gridColumn: 2 },
  scope: { gridColumn: 3 },
  indicator: { visibility: "hidden", textAlign: "center" },
  dateIndicator: {},
  titleIndicator: { transform: "translateX(2.3px)" },
  scopeIndicator: { transform: "translateX(1.3px)" },
  visible: { visibility: "visible" },
  all: { gridColumn: 4, color: "inherit", textAlign: "right", textDecoration: "none" },
  section: {
    display: { default: "grid", [media.desktop]: "contents" },
    gridTemplateColumns: "subgrid",
    gridColumn: "1 / -1",
    gridRow: { default: null, [media.mobile]: 2 },
    minWidth: 0,
    minHeight: { default: null, [media.mobile]: 0 },
    alignContent: "start",
    overflowY: { default: null, [media.mobile]: "auto" },
    scrollbarWidth: "none",
    paddingBottom: { default: null, [media.mobile]: "8px" },
    "::-webkit-scrollbar": { display: "none" },
  },
  list: { display: "grid", gridColumn: "1 / -1", gridTemplateColumns: "subgrid" },
});
