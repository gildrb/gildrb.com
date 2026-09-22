import { informationPaths } from "./src/content/pages";
import path from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "vite-plus";
import preact from "@preact/preset-vite";
import { contentPlugin } from "./build/content";
import { caseProjects } from "./src/content/projects";
const require = createRequire(import.meta.url);
const vgpuRequire = createRequire(require.resolve("vgpu"));
const { wgslVitePlugin } = await import(vgpuRequire.resolve("@vgpu/wgsl/loader-vite"));

export default defineConfig({
  publicDir: "src/static",
  plugins: [
    contentPlugin(),
    wgslVitePlugin(),
    preact({
      prerender: {
        enabled: true,
        renderTarget: "#app",
        prerenderScript: path.resolve("src/prerender.tsx"),
        additionalPrerenderRoutes: [
          "/all",
          ...informationPaths,
          ...caseProjects.map((project) => project.href),
        ],
        previewMiddlewareEnabled: true,
      },
    }),
  ],
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 400,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "portfolio",
              test: /\/src\/components\/(Layout|Portfolio)\.tsx$|\/src\/lib\/(theme|sort|page)\.ts$|\/src\/app\.tsx$/,
              priority: 10,
            },
            {
              name: "prerender-only",
              test: /prerender\.tsx|preact-render-to-string|profile\.json/,
              priority: 5,
            },
          ],
        },
      },
    },
  },
  server: { host: "127.0.0.1", port: 5174 },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  fmt: {
    ignorePatterns: [
      "atmosphere/**",
      "src/static/**",
      "package-lock.json",
      "**/*.wgsl",
      "docs/**",
      "src/content/**/*.md",
    ],
  },
  lint: {
    ignorePatterns: ["atmosphere/**", "src/static/**"],
    options: { typeAware: true, typeCheck: true },
  },
});
