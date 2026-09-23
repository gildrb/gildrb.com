import type { VNode } from "preact";
import { renderToString } from "preact-render-to-string";
import { files } from "./files.ts";
import type { Assets } from "./layout.tsx";
import { AllPage, CasePage, DocPage } from "./pages/case.tsx";
import { Home } from "./pages/home.tsx";
import { cases, origin, pages } from "./site.ts";

const sources = import.meta.glob<string>("./content/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const markdown = Object.fromEntries(
  Object.entries(sources).map(([path, text]) => [path.replace(/^\.\/content\/|\.md$/g, ""), text]),
);

function text(slug: string): string {
  const body = markdown[slug];
  if (body === undefined) throw new Error(`Missing src/content/${slug}.md`);
  return body;
}

// Cloudflare email obfuscation would rewrite the visible address, so opt the copy button out.
const html = (page: VNode) =>
  `<!doctype html>\n${renderToString(page).replace(
    /<div[^>]*data-island="email"[\s\S]*?<\/button><\/div>/g,
    (island) => `<!--email_off-->${island}<!--/email_off-->`,
  )}\n`;

/** Every generated file of the site, keyed by its path in the output directory. */
export function render(assets: Assets): Record<string, string> {
  return {
    "index.html": html(<Home assets={assets} />),
    "all.html": html(<AllPage assets={assets} markdown={markdown} />),
    ...Object.fromEntries(
      cases.map((item) => [
        `${item.slug}.html`,
        html(<CasePage assets={assets} item={item} markdown={text(item.slug)} />),
      ]),
    ),
    ...Object.fromEntries(
      pages.map((page) => [
        `${page.slug}.html`,
        html(<DocPage assets={assets} page={page} markdown={text(page.slug)} />),
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(markdown).map(([slug, body]) => [`content/${slug}.md`, body]),
    ),
    ...files,
    "llms-full.txt": fullText(),
  };
}

/** The whole public text in one Markdown file, for agents that should not crawl. */
function fullText(): string {
  const sections = [
    {
      heading: "Homepage",
      path: "/",
      source: "/index.html.md",
      body: files["index.html.md"] ?? "",
    },
    ...[...cases, ...pages].map(({ slug, name }) => ({
      heading: name,
      path: `/${slug}`,
      source: `/content/${slug}.md`,
      body: text(slug),
    })),
  ];
  return `# gildrb.com

> Every public page of ${origin}/ in one Markdown file.

${sections.map(({ heading, path }) => `- [${heading}](${origin}${path})`).join("\n")}

---

${sections
  .map(({ heading, path, source, body }) =>
    [
      `## ${heading}`,
      "",
      `Page: ${origin}${path}`,
      `Markdown: ${origin}${source}`,
      "",
      body.trim(),
    ].join("\n"),
  )
  .join("\n\n---\n\n")}
`;
}
