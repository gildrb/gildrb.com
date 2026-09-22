import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { caseProjects } from "../src/content/projects";
import { informationPaths } from "../src/content/pages";
import { site } from "../build/identity";

const routes = ["/", "/all", ...caseProjects.map((project) => project.href), ...informationPaths];
const results: Record<string, unknown> = { routes: [] };
for (const route of routes) {
  const file = path.join("dist", route === "/" ? "index.html" : route.slice(1) + "/index.html");
  const html = await fs.readFile(file, "utf8");
  assert.match(html, /<div id="app">[\s\S]*Gil Rodrigues/, `${route}: prerendered page content`);
  assert.match(html, /mail@gildrb\.com/, `${route}: canonical contact`);
  assert.ok(html.includes(`href="${site.origin}${route}"`), `${route}: canonical URL`);
  assert.doesNotMatch(
    html,
    /(?:src|href)="media:|@include:|@inline-|Source template/,
    `${route}: no unresolved manual templates`,
  );
  assert.match(html, /application\/ld\+json/, `${route}: structured metadata`);
  const local = [
    ...html.matchAll(
      /(?:src|href)="(\/(?:assets|fonts|images|environment)\/[^"?#]+)(?:[?#][^"]*)?"/g,
    ),
  ];
  for (const [, resource] of local) await fs.access(path.join("dist", resource!));
}
results.routes = routes;
const styles = await fs.readFile("src/styles/site.css", "utf8");
assert.match(styles, /\.portfolio-table-header\s*\{[^}]*background:\s*transparent/s);
assert.match(styles, /mask-image:/);
assert.doesNotMatch(
  styles,
  /(?:\.name|\.portfolio-table-header)\s*\{[^}]*background:\s*(?:#000|black|var\(--bg\))/s,
);
const names = await fs.readdir("dist/assets");
const files = await Promise.all(
  names
    .filter((name) => name.endsWith(".js"))
    .map(async (name) => ({ name, source: await fs.readFile(`dist/assets/${name}`) })),
);
const runtime = files.find((file) => file.name.startsWith("runtime-"));
assert.ok(runtime, "VGPU must remain an explicit lazy module");
const runtimeGzip = gzipSync(runtime.source).length;
assert.ok(runtimeGzip < 110_000, `Live renderer bundle exceeds 110 KB gzip: ${runtimeGzip}`);
results.rendererGzipBytes = runtimeGzip;
const boot = files.filter((file) => /^(?:index|portfolio)-/.test(file.name));
assert.ok(boot.length > 0);
const bootGzip = boot.reduce((total, file) => total + gzipSync(file.source).length, 0);
assert.ok(bootGzip < 25_000, `Initial application JS exceeds 25 KB gzip: ${bootGzip}`);
results.applicationGzipBytes = bootGzip;
const posters = await fs.readdir("src/static/environment");
for (const name of posters.filter((name) => name.endsWith(".webp"))) {
  assert.ok(
    (await fs.stat(`dist/environment/${name}`)).size < 25_000,
    `${name}: first-paint image budget`,
  );
}
results.posters = posters;
const maps = names.filter((name) => name.endsWith(".map"));
results.sourceMaps = maps.length;
assert.ok(
  !(await fs.readdir("src")).some((name) => name.endsWith(".template.html")),
  "No duplicate HTML templates",
);
for (const project of caseProjects) {
  assert.equal(
    await fs.readFile(`dist/content/${project.slug}.md`, "utf8"),
    await fs.readFile(`src/content/${project.slug}.md`, "utf8"),
  );
}
await fs.mkdir("validation", { recursive: true });
await fs.writeFile("validation/output.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
