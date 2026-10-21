import { describe, expect, test } from "vite-plus/test";
import { render } from "./render.tsx";
import { origin } from "./site.ts";

const site = render({ script: "/assets/client.js", css: "", shareImage: "/images/og.png" });

function page(file: string): string {
  const html = site[file];
  if (html === undefined) throw new Error(`${file} was not rendered`);
  return html;
}

/** The text a reader without JavaScript gets, and the markup it comes in (scripts left out). */
function rawContent(html: string): { text: string; markup: string } {
  const body = /<body[\s\S]*<\/body>/.exec(html)?.[0] ?? "";
  const markup = body.replaceAll(/<script[\s\S]*?<\/script>/g, "");
  const text = markup
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/&[a-z]+;|&#\d+;/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  return { text, markup };
}

describe("homepage without JavaScript", () => {
  test("carries its text in the raw HTML, at least 5% of the markup", () => {
    const { text, markup } = rawContent(page("index.html"));
    expect(text.length).toBeGreaterThanOrEqual(500);
    expect(text.length / markup.length).toBeGreaterThanOrEqual(0.05);
  });

  test("has one h1", () => {
    expect(page("index.html").match(/<h1[\s>]/g)).toHaveLength(1);
  });
});

describe("side archive", () => {
  test("ships its tiles as data, not markup, beside the homepage and plain pages", () => {
    for (const file of ["index.html", "about.html"]) {
      const html = page(file);
      const column = /<section[^>]*data-side-archive[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
      expect(column, file).not.toBe("");
      expect(column.replaceAll(/<script[\s\S]*?<\/script>/g, ""), file).not.toContain("<a ");
      expect(column, file).toContain('"href":"/t3"');
    }
  });
});

describe("project pages", () => {
  test("link every part from the contents, and every link has its heading", () => {
    for (const file of ["filen.html", "archetypon.html"]) {
      const html = page(file);
      expect(html, file).not.toContain("data-side-archive");
      const nav = /<nav[^>]*data-contents[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
      const targets = [...nav.matchAll(/href="#([^"]+)"/g)].map(([, id]) => id);
      expect(targets.length, file).toBeGreaterThan(1);
      for (const id of targets)
        expect(html, `${file} #${id}`).toMatch(new RegExp(`<h2[^>]*id="${id}"`));
    }
  });
});

describe("project table", () => {
  test("names each row by what it shows: date, title, scope", () => {
    const html = page("index.html");
    const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(([, ids]) => ids);
    expect(labelled.length).toBeGreaterThan(0);
    for (const ids of labelled.filter((value) => value?.startsWith("P"))) {
      const parts = ids?.split(" ") ?? [];
      expect(parts.map((id) => id.replace(/^.*-/, ""))).toEqual(["date", "title", "scope"]);
      for (const id of parts) expect(html).toContain(`id="${id}"`);
    }
  });

  test("sort buttons are named starting with their visible label", () => {
    const html = page("index.html");
    for (const label of ["Date", "Project", "Scope"]) {
      expect(html).toMatch(new RegExp(`aria-label="${label}, sort projects by`));
    }
  });
});

describe("Personal Agent Protocol discovery", () => {
  test("declares the public website of this domain and nothing it does not serve", () => {
    const poppy: unknown = JSON.parse(page(".well-known/poppy.json"));
    expect(poppy).toEqual({
      protocol_version: "0.1",
      organization: { name: "Gil Rodrigues", domain: new URL(origin).hostname },
      web: {},
    });
  });
});
