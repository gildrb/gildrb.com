import { informationSlugs, informationPaths } from "../src/content/pages";
import fs from "node:fs/promises";
import path from "node:path";
import MarkdownIt from "markdown-it";
import type { Plugin } from "vite-plus";
import type { CaseBlock, CaseDocument } from "../src/lib/types";
import { caseProjects, projects } from "../src/content/projects";
import { site, schema } from "./identity";

const markdown = new MarkdownIt({ html: false, linkify: true });
const defaultLink = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]!;
  const href = String(token.attrGet("href") ?? "");
  token.attrSet("class", /^https?:/.test(href) ? "external-link" : "internal-link");
  if (/^https?:/.test(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
  }
  return defaultLink
    ? defaultLink(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options);
};

export function parseCase(source: string): CaseDocument {
  const tokens = markdown.parse(source, {});
  const title = tokens[1]?.content ?? "";
  if (tokens[0]?.tag !== "h1" || !title) throw new Error("A case needs one leading H1");
  const blocks: CaseBlock[] = [];
  let pending: typeof tokens = [];
  const flush = () => {
    if (pending.length)
      blocks.push({ type: "html", html: markdown.renderer.render(pending, markdown.options, {}) });
    pending = [];
  };
  for (let i = 3; i < tokens.length; i++) {
    const token = tokens[i]!;
    const inline = tokens[i + 1];
    const children = inline?.children ?? [];
    const images = children.filter((child) => child.type === "image");
    if (
      token.type === "paragraph_open" &&
      images.length &&
      children.every((child) => child.type === "image" || child.type === "softbreak") &&
      images.every((image) => String(image.attrGet("src")).startsWith("media:"))
    ) {
      flush();
      const refs = images.map((image) => ({
        id: String(image.attrGet("src")).slice(6),
        caption: image.content,
      }));
      if (refs.length === 1) blocks.push({ type: "media", ...refs[0]! });
      else blocks.push({ type: "gallery", images: refs });
      i += 2;
      continue;
    }
    if (token.type === "fence") {
      flush();
      blocks.push({
        type: "code",
        code: token.content,
        language: token.info.split(/\s/)[0],
        title: token.info.match(/title="([^"]+)"/)?.[1],
      });
    } else pending.push(token);
  }
  flush();
  return { title, blocks };
}

export function contentPlugin(): Plugin {
  return {
    name: "portfolio-content",
    resolveId(id) {
      if (id === "virtual:portfolio-site") return "\0portfolio-site";
    },
    load(id) {
      if (id === "\0portfolio-site") return `export default ${JSON.stringify(site)}`;
    },
    async transform(_code, id) {
      if (!id.endsWith(".md") || !id.includes("/src/content/")) return;
      return {
        code: `export default ${JSON.stringify(parseCase(await fs.readFile(id, "utf8")))};`,
        map: null,
      };
    },
    async generateBundle() {
      const pages = await Promise.all(
        caseProjects.map(async (project) => ({
          project,
          text: await fs.readFile(path.resolve("src/content", `${project.slug}.md`), "utf8"),
        })),
      );
      const home = `# ${site.name}\n\n${site.description}\n\n${projects.map((p) => `- [${p.title}](${p.external ? p.href : site.origin + p.href}) (${p.scope})`).join("\n")}\n\nContact: ${site.email}\n`;
      const assets: Record<string, string> = {
        "index.html.md": home,
        "profile.json": JSON.stringify(schema, null, 2),
        "llms-full.txt": [home, ...pages.map(({ text }) => text)].join("\n\n---\n\n"),
        "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/all", ...informationPaths, ...caseProjects.map((p) => p.href)].map((p) => `<url><loc>${site.origin}${p}</loc></url>`).join("")}</urlset>`,
      };
      for (const slug of informationSlugs)
        assets[`content/${slug}.md`] = await fs.readFile(
          path.resolve("src/content", `${slug}.md`),
          "utf8",
        );
      for (const { project, text } of pages) assets[`content/${project.slug}.md`] = text;
      for (const [fileName, source] of Object.entries(assets))
        this.emitFile({ type: "asset", fileName, source });
    },
  };
}
