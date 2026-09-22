import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { projects, type Project } from "../content/projects";
import { initialSort, parseSort, sortProjects, type Sort, type SortKey } from "../lib/sort";

export function ProjectRow({ project }: { project: Project }) {
  return (
    <a class="portfolio-card-link" href={project.href}>
      <time dateTime={project.date}>
        <span class="portfolio-date-full">{project.date}</span>
        <span class="portfolio-date-year">{project.date.slice(0, 7)}</span>
      </time>
      <h3 class="portfolio-card-title">{project.title}</h3>
      <span class="portfolio-card-scope">{project.scope}</span>
      <span class="portfolio-card-arrow" aria-hidden="true">
        <span class="portfolio-card-view">View</span>
        {project.external ? "↗" : "→"}
      </span>
    </a>
  );
}
export function SortHeader({ sort, onSort }: { sort: Sort; onSort: (key: SortKey) => void }) {
  return (
    <div class="portfolio-table-header" aria-label="Project columns">
      {(["date", "title", "scope"] as const).map((key, i) => (
        <button
          key={key}
          class={`portfolio-sort-button portfolio-sort-${key}`}
          aria-pressed={sort.key === key}
          aria-label={`Sort projects by ${key}${sort.key === key ? `, ${sort.direction}` : ""}`}
          type="button"
          onClick={() => onSort(key)}
        >
          <span>{["Date", "Project", "Scope"][i]} </span>
          <span
            class="portfolio-sort-indicator"
            aria-hidden="true"
            style={{ visibility: sort.key === key ? "visible" : "hidden" }}
          >
            {sort.direction === "ascending" ? "↑" : "↓"}
          </span>
        </button>
      ))}
      <a class="portfolio-link-heading" href={`/all?sort=${sort.key}&direction=${sort.direction}`}>
        All
      </a>
    </div>
  );
}
export function useProjectSort() {
  const [sort, setSort] = useState(initialSort);
  useEffect(() => setSort(parseSort(location.search)), []);
  return {
    sort,
    onSort: (key: SortKey) =>
      setSort((previous) => ({
        key,
        direction:
          previous.key === key && previous.direction === "descending"
            ? "ascending"
            : previous.key === key
              ? "descending"
              : key === "date"
                ? "descending"
                : "ascending",
      })),
  };
}
export function Portfolio() {
  const { sort, onSort } = useProjectSort();
  const list = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const sorted = useMemo(() => sortProjects(projects, sort), [sort]);
  const measure = () => {
    const node = list.current;
    if (node)
      setEdges({
        top: node.scrollTop > 1,
        bottom: node.scrollHeight - node.scrollTop - node.clientHeight > 1,
      });
  };
  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (list.current) observer.observe(list.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div class="portfolio-scroll-frame">
      <SortHeader sort={sort} onSort={onSort} />
      <section
        ref={list}
        class="portfolio-section"
        aria-label="Portfolio"
        tabIndex={0}
        onScroll={measure}
        data-fade-top={edges.top}
        data-fade-bottom={edges.bottom}
      >
        <div class="portfolio-list">
          {sorted.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
}
