import { useWebMcp } from "./lib/webmcp";
import { Layout } from "./components/Layout";
import { Portfolio, SortHeader, useProjectSort } from "./components/Portfolio";
import { caseProjects } from "./content/projects";
import { site } from "./content/site";
import type { PageData } from "./lib/page";
import { sortProjects } from "./lib/sort";
import { Environment } from "./environment/Environment";

export function App({ path, documents, CaseView }: PageData) {
  useWebMcp();
  const { sort, onSort } = useProjectSort();
  const home = path === "/";
  const project = caseProjects.find((item) => item.href === path);
  return (
    <>
      <a class="skip-link" href="#main-content">
        Skip to content
      </a>
      {home && <Environment />}
      <Layout home={home}>
        {home ? (
          <>
            <section class="profile-summary" aria-labelledby="profile-summary-title">
              <h2 class="section-title" id="profile-summary-title">
                About
              </h2>
              <p class="profile-copy">{site.description}</p>
            </section>
            <Portfolio />
          </>
        ) : path === "/all" && CaseView ? (
          <section class="all-projects">
            <p class="case-location">
              <a href="/">Home</a> / All projects
            </p>
            <div class="all-sort">
              <SortHeader sort={sort} onSort={onSort} />
            </div>
            {sortProjects(caseProjects, sort).map((item) => (
              <CaseView
                key={item.slug}
                slug={item.slug}
                document={documents[item.slug]!}
                next={false}
              />
            ))}
          </section>
        ) : project && CaseView ? (
          <>
            <p class="case-location">
              <a href="/">Home</a> / {project.title}
            </p>
            <CaseView slug={project.slug} document={documents[project.slug]!} />
          </>
        ) : CaseView && documents[path.slice(1)] ? (
          <CaseView slug={path.slice(1)} document={documents[path.slice(1)]!} next={false} />
        ) : (
          <section>
            <h2>Page not found</h2>
            <p>
              <a href="/">Return to the portfolio</a>
            </p>
          </section>
        )}
      </Layout>
    </>
  );
}
