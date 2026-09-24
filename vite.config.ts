import assert from "node:assert";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import stylex from "@stylexjs/unplugin";
import { defineConfig, type Plugin } from "vite-plus";

type Render = typeof import("./src/render.tsx");

const ssrOutDir = "node_modules/.site-ssr";

// StyleX's plugin exposes the CSS it has collected so far; the dev server inlines it, so pages are
// styled from their first byte exactly as in production (no separate stylesheet or runtime).
const stylexPlugin: Plugin & { __stylexCollectCss?: () => string } = stylex.vite({
  useCSSLayers: true,
  lightningcssOptions: { minify: true },
  devMode: "css-only",
});

const site: Plugin = {
  name: "site",
  configureServer(server) {
    // Pages are server-rendered on each request, so any source edit simply reloads the page.
    server.watcher.on("change", (file) => {
      if (file.includes(`${path.sep}src${path.sep}`)) server.ws.send({ type: "full-reload" });
    });
    server.middlewares.use(async (request, response, next) => {
      const { pathname } = new URL(request.url ?? "/", "http://localhost");
      const { render } = (await server.ssrLoadModule("/src/render.tsx")) as Render;
      const files = render({
        script: "/src/client.ts",
        css: stylexPlugin.__stylexCollectCss?.() ?? "",
      });
      const file = [pathname.slice(1), `${pathname.slice(1) || "index"}.html`].find(
        (name) => name in files,
      );
      if (!file) return next();
      const body = files[file] ?? "";
      response.setHeader("Content-Type", file.endsWith(".html") ? "text/html" : "text/plain");
      response.end(file.endsWith(".html") ? await server.transformIndexHtml(pathname, body) : body);
    });
  },
};

export default defineConfig({
  staged: { "*": "vp check --fix" },
  fmt: { ignorePatterns: ["src/content/**", "public/**"] },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  appType: "custom",
  server: { host: "127.0.0.1", port: 5174, strictPort: false },
  plugins: [stylexPlugin, site],
  environments: {
    client: { build: { rollupOptions: { input: "src/client.ts" } } },
    ssr: { build: { outDir: ssrOutDir, rollupOptions: { input: "src/render.tsx" } } },
  },
  builder: {
    // Prerender every page: the SSR pass registers all StyleX rules, the client pass
    // bundles the islands and emits the collected CSS, which is inlined into each page.
    async buildApp(builder) {
      const { ssr, client: browser } = builder.environments;
      assert(ssr && browser);
      await builder.build(ssr);
      const client = await builder.build(browser);
      assert("output" in client);
      const entry = client.output.find((chunk) => chunk.type === "chunk" && chunk.isEntry);
      assert(entry);
      const outDir = browser.config.build.outDir;
      const cssFile = path.join(outDir, "assets/stylex.css");
      const css = await readFile(cssFile, "utf8");
      const { render } = (await import(path.resolve(ssrOutDir, "render.mjs"))) as Render;
      await Promise.all(
        Object.entries(render({ script: `/${entry.fileName}`, css })).map(async ([file, body]) => {
          await mkdir(path.dirname(path.join(outDir, file)), { recursive: true });
          await writeFile(path.join(outDir, file), body);
        }),
      );
      await Promise.all([rm(cssFile), rm(ssrOutDir, { recursive: true })]);
    },
  },
});
