import type { Project } from "../content/projects";
export type SortKey = "date" | "title" | "scope";
export type SortDirection = "ascending" | "descending";
export interface Sort {
  key: SortKey;
  direction: SortDirection;
}
export const initialSort: Sort = { key: "date", direction: "descending" };
export function parseSort(search: string): Sort {
  const params = new URLSearchParams(search);
  const key = params.get("sort");
  return {
    key: key === "title" || key === "scope" ? key : "date",
    direction: params.get("direction") === "ascending" ? "ascending" : "descending",
  };
}
export function sortProjects(projects: readonly Project[], sort: Sort): Project[] {
  return [...projects].sort((a, b) => {
    const value = a[sort.key].localeCompare(b[sort.key], "en", { sensitivity: "base" });
    return (sort.direction === "ascending" ? value : -value) || a.slug.localeCompare(b.slug);
  });
}
