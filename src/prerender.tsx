import { informationPaths } from "./content/pages";
import { renderToString } from "preact-render-to-string";
import { App } from "./app";
import { loadPage } from "./lib/page";
import { site, schema } from "../build/identity";
import { caseProjects } from "./content/projects";
export async function prerender({ url }: { url: string }) {
  const path = new URL(url, site.origin).pathname;
  const page = await loadPage(path);
  const project = caseProjects.find((item) => item.href === page.path);
  const heading = project?.title ?? page.documents[page.path.slice(1)]?.title;
  const title = heading ? `${heading} · ${site.name}` : site.title;
  return {
    html: renderToString(<App {...page} />),
    links: new Set(["/", "/all", ...informationPaths, ...caseProjects.map((item) => item.href)]),
    head: {
      title,
      lang: "en",
      elements: new Set([
        { type: "link", props: { rel: "canonical", href: site.origin + page.path } },
        { type: "meta", props: { name: "description", content: site.description } },
        { type: "meta", props: { property: "og:title", content: title } },
        { type: "meta", props: { property: "og:description", content: site.description } },
        { type: "meta", props: { property: "og:url", content: site.origin + page.path } },
        {
          type: "script",
          props: { type: "application/ld+json" },
          children: JSON.stringify(schema).replace(/</g, "\\u003c"),
        },
      ]),
    },
  };
}
