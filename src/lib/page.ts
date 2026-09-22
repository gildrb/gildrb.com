import type { ComponentType } from "preact";
import type { CaseStudyProps } from "../components/CaseStudy";
import { informationSlugs } from "../content/pages";
import { caseProjects } from "../content/projects";
import type { CaseDocument } from "./types";
export interface PageData {
  path: string;
  documents: Record<string, CaseDocument>;
  CaseView?: ComponentType<CaseStudyProps>;
}
const documents = import.meta.glob<CaseDocument>(["../content/*.md", "!../content/README.md"], {
  import: "default",
});
export async function loadPage(pathname: string): Promise<PageData> {
  const path = pathname.replace(/\/$/, "") || "/";
  const routes = [...caseProjects, ...informationSlugs.map((slug) => ({ slug, href: `/${slug}` }))];
  const wanted = path === "/all" ? caseProjects : routes.filter((project) => project.href === path);
  const entries = await Promise.all(
    wanted.map(async (project) => {
      const load = documents[`../content/${project.slug}.md`];
      if (!load) throw new Error(`Missing authored case: ${project.slug}`);
      return [project.slug, await load()] as const;
    }),
  );
  const CaseView = wanted.length ? (await import("../components/CaseStudy")).CaseStudy : undefined;
  return { path, documents: Object.fromEntries(entries), CaseView };
}
