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

describe("project pages", () => {
  test("link every part from the contents, and every link has its heading", () => {
    for (const file of ["filen.html", "t3.html"]) {
      const html = page(file);
      const nav = /<nav[^>]*data-contents[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
      const targets = [...nav.matchAll(/href="#([^"]+)"/g)].map(([, id]) => id);
      expect(targets.length, file).toBeGreaterThan(1);
      for (const id of targets)
        expect(html, `${file} #${id}`).toMatch(new RegExp(`<h2[^>]*id="${id}"`));
    }
  });

  test("a page that fits a screen or two lists no contents", () => {
    for (const file of ["archetypon.html", "eukhe.html"])
      expect(page(file), file).not.toContain("data-contents");
  });
});

describe("project table", () => {
  test("names each row by what it shows: title, descriptor, then its date or platform", () => {
    const html = page("index.html");
    const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(([, ids]) => ids);
    const rows = labelled.filter((value) => value?.startsWith("P"));
    expect(rows.length).toBeGreaterThan(0);
    for (const ids of rows) {
      const parts = (ids?.split(" ") ?? []).map((id) => id.replace(/^.*-/, ""));
      expect(parts).toEqual(["title", "descriptor", "end"]);
      for (const id of ids?.split(" ") ?? []) expect(html).toContain(`id="${id}"`);
    }
  });

  test("lists maintained projects before design work, whatever their dates", () => {
    const html = page("index.html");
    const at = (text: string) => html.indexOf(text);
    const order = [">Projects</h3>", ">Heph</h4>", ">Design</h3>", ">Local Studio</h4>"].map(at);
    for (const index of order) expect(index).toBeGreaterThan(-1);
    expect(order).toEqual(order.toSorted((left, right) => left - right));
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
