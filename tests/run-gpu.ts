import { build } from "vite-plus";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
const require = createRequire(import.meta.url);
const local = createRequire(require.resolve("vgpu"));
const { wgslVitePlugin } = await import(local.resolve("@vgpu/wgsl/loader-vite"));
await build({
  configFile: false,
  plugins: [wgslVitePlugin()],
  publicDir: false,
  build: {
    ssr: "tests/gpu.ts",
    outDir: ".gpu-cache",
    target: "node22",
    minify: false,
    rollupOptions: { output: { entryFileNames: "gpu.mjs" } },
  },
});
const run = spawnSync(process.execPath, [path.resolve(".gpu-cache/gpu.mjs")], {
  stdio: "inherit",
  env: process.env,
});
process.exitCode = run.status ?? 1;
