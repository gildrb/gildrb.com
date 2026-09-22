import { describe, expect, it } from "vite-plus/test";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseCase } from "../build/content";
import { projects, caseProjects } from "../src/content/projects";
import { initialSort, parseSort, sortProjects } from "../src/lib/sort";
import { localSkyState } from "../src/environment/state";
import media from "../src/content/media.json";

describe("one portfolio registry", () => {
  it("uses unique routes and keeps all existing nine projects", () => {
    expect(projects).toHaveLength(9);
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length);
  });
  it("sorts a copy, not the source registry", () => {
    const snapshot = JSON.stringify(projects);
    expect(sortProjects(projects, initialSort)[0]?.slug).toBe("davis7");
    expect(sortProjects(projects, { key: "date", direction: "ascending" })[0]?.slug).toBe("ml7");
    expect(JSON.stringify(projects)).toBe(snapshot);
  });
  it("validates query state", () => {
    expect(parseSort("?sort=bad&direction=x")).toEqual(initialSort);
    expect(parseSort("?sort=title&direction=ascending")).toEqual({
      key: "title",
      direction: "ascending",
    });
  });
});
describe("authored content", () => {
  it("extracts a leading title and semantic Markdown", () => {
    expect(parseCase("# Test\n\nHello **world**.").blocks).toEqual([
      { type: "html", html: "<p>Hello <strong>world</strong>.</p>\n" },
    ]);
  });
  it("rejects missing titles", () => expect(() => parseCase("body")).toThrow());
  it("does not execute HTML in Markdown", () =>
    expect(JSON.stringify(parseCase("# Test\n\n<script>alert(1)</script>"))).toContain(
      "&lt;script&gt;",
    ));
  it("renders adjacent media as a gallery", () =>
    expect(parseCase("# Gallery\n\n![One](media:a)\n![Two](media:b)").blocks).toEqual([
      {
        type: "gallery",
        images: [
          { id: "a", caption: "One" },
          { id: "b", caption: "Two" },
        ],
      },
    ]));
  it("preserves fenced code labels", () =>
    expect(parseCase('# Demo\n\n```text title="Example"\nrun\n```').blocks[0]).toMatchObject({
      type: "code",
      title: "Example",
      code: "run\n",
    }));
  for (const project of caseProjects)
    it(`${project.slug} has complete authored media`, async () => {
      const text = await fs.readFile(`src/content/${project.slug}.md`, "utf8");
      const doc = parseCase(text);
      const refs = [...text.matchAll(/\]\(media:([^)]+)\)/g)].map((match) => match[1]);
      const actual = doc.blocks.flatMap((block) =>
        block.type === "media"
          ? [block.id]
          : block.type === "gallery"
            ? block.images.map((image) => image.id)
            : [],
      );
      expect(actual).toEqual(refs);
      for (const id of actual) expect(media).toHaveProperty(`${project.slug}/${id}`);
      expect(JSON.stringify(doc)).not.toContain('src="media:');
    });
});
describe("VGPU provenance and fixed viewpoint", () => {
  it("keeps every verified upstream file byte-identical", async () => {
    const hashes = JSON.parse(
      await fs.readFile("atmosphere/original-files.sha256.json", "utf8"),
    ) as Record<string, string>;
    expect(Object.keys(hashes)).toHaveLength(32);
    for (const [name, hash] of Object.entries(hashes))
      expect(
        createHash("sha256")
          .update(await fs.readFile(`atmosphere/${name}`))
          .digest("hex"),
        name,
      ).toBe(hash);
  });
  it("changes illumination, not the camera", () => {
    for (let hour = 0; hour < 24; hour++)
      expect(localSkyState({}, new Date(2026, 8, 22, hour))).toMatchObject({
        pitch: 78,
        yaw: 0,
        altitudeKm: 0.08,
      });
    expect(localSkyState({}, new Date(2026, 8, 22, 12)).sunElevation).toBeGreaterThan(50);
    expect(localSkyState({}, new Date(2026, 8, 22, 0)).sunElevation).toBeLessThan(0);
  });
  it("keeps minute-sized lighting steps for temporal history", () =>
    expect(localSkyState({}, new Date(2026, 8, 22, 17, 1, 0))).toEqual(
      localSkyState({}, new Date(2026, 8, 22, 17, 1, 59)),
    ));
  it("rejects invalid dates", () => expect(() => localSkyState({}, new Date(NaN))).toThrow());
  it("does not include terrain, GUI or pointer handlers in the active renderer", async () => {
    const graph = await fs.readFile("src/environment/graph.ts", "utf8");
    const runtime = await fs.readFile("src/environment/runtime.ts", "utf8");
    expect(graph).not.toMatch(
      /terrain-depth|terrain-heightmap|terrain-sun-depth|lil-gui|installControls/,
    );
    expect(runtime).not.toMatch(/addEventListener\(['"](?:pointer|mouse|touch)/);
    expect(graph).toContain("terrainTextures: 0");
  });
});
