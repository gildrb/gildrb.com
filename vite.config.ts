import assert from "node:assert";
import type { IncomingMessage, ServerResponse } from "node:http";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import stylexVite from "@stylexjs/unplugin/vite";
import { defineConfig, type Plugin } from "vite-plus";

type Render = typeof import("./src/render.tsx");

/** The renderer module, as the bundler hands it back untyped; its signatures are `render.tsx`'s. */
function isRender(module: unknown): module is Render {
  return (
    typeof module === "object" &&
    module !== null &&
    "render" in module &&
    typeof module.render === "function" &&
    "ogImage" in module &&
    typeof module.ogImage === "function" &&
    "stamp" in module &&
    typeof module.stamp === "function" &&
    "versionedCopies" in module &&
    typeof module.versionedCopies === "function" &&
    "shareImagePath" in module &&
    typeof module.shareImagePath === "string"
  );
}

function renderModule(module: unknown): Render {
  if (!isRender(module)) throw new TypeError("src/render.tsx lacks the expected exports");
  return module;
}

const ssrOutDir = "node_modules/.site-ssr";

// StyleX's plugin exposes the CSS it has collected so far; the dev server inlines it, so pages are
// styled from their first byte exactly as in production (no separate stylesheet or runtime).
const stylexPlugin: Plugin & { __stylexCollectCss?: () => string } = stylexVite({
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
    // Connect ignores returned promises: hand a rejection to `next` so it reaches the error page.
    server.middlewares.use((request, response, next) => {
      serve(request, response).then(
        (handled) => {
          if (!handled) next();
        },
        (error: unknown) => next(error),
      );
    });
    /** Answers the request if it names a page or the share image; false lets Vite serve it. */
    async function serve(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
      const { pathname } = new URL(request.url ?? "/", "http://localhost");
      const { render, ogImage, shareImagePath, versionedCopies } = renderModule(
        await server.ssrLoadModule("/src/render.tsx"),
      );
      const css = stylexPlugin.__stylexCollectCss?.() ?? "";
      if (pathname === shareImagePath) {
        response.setHeader("Content-Type", "image/png");
        response.end(await ogImage(css));
        return true;
      }
      const files = render({ script: "/src/client.ts", css, shareImage: shareImagePath });
      // A stamped font or image: rewrite the URL so Vite serves the public file it copies.
      const copy = versionedCopies().get(pathname);
      if (copy) {
        request.url = copy;
        return false;
      }
      const file = [pathname.slice(1), `${pathname.slice(1) || "index"}.html`].find(
        (name) => name in files,
      );
      if (!file) return false;
      const body = files[file] ?? "";
      response.setHeader("Content-Type", file.endsWith(".html") ? "text/html" : "text/plain");
      response.end(file.endsWith(".html") ? await server.transformIndexHtml(pathname, body) : body);
      return true;
    }
  },
};

export default defineConfig({
  staged: { "*": "vp check --fix" },
  fmt: { ignorePatterns: ["src/content/**", "public/**"] },
  lint: {
    ignorePatterns: ["public/**"],
    plugins: ["typescript", "unicorn", "oxc", "import"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    categories: { correctness: "error", suspicious: "error" },
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "typescript/consistent-type-definitions": ["error", "type"],
      "typescript/switch-exhaustiveness-check": "error",
      "typescript/no-floating-promises": "error",
      "typescript/no-misused-promises": "error",
      "no-var": "error",
      // StyleX names the hook that hands over its collected CSS.
      "no-underscore-dangle": ["error", { allow: ["__stylexCollectCss"] }],
      "prefer-const": "error",
      eqeqeq: "error",
    },
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
      const { render, ogImage, shareImagePath, stamp, versionedCopies } = renderModule(
        await import(path.resolve(ssrOutDir, "render.mjs")),
      );
      // The share image first: the pages link it by a name stamped with its bytes.
      const shareImage = await ogImage(css);
      const shareImageUrl = stamp(shareImagePath, shareImage);
      await writeFile(path.join(outDir, shareImageUrl), shareImage);
      const assets = { script: `/${entry.fileName}`, css, shareImage: shareImageUrl };
      await Promise.all(
        Object.entries(render(assets)).map(async ([file, body]) => {
          await mkdir(path.dirname(path.join(outDir, file)), { recursive: true });
          await writeFile(path.join(outDir, file), body);
        }),
      );
      // Rendering named every stamped font and image; copy each public file to its stamped name.
      await Promise.all(
        [...versionedCopies()].map(([stamped, source]) =>
          copyFile(path.join(outDir, source), path.join(outDir, stamped)),
        ),
      );
      await Promise.all([rm(cssFile), rm(ssrOutDir, { recursive: true })]);
    },
  },
});
