import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { discoverAtmosphere } from './atmosphere-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function buildAtmosphereBackground(output) {
  const source = await discoverAtmosphere(root);
  const require = createRequire(path.join(root, 'package.json'));
  const fromVgpu = createRequire(require.resolve('vgpu'));
  const loaderUrl = pathToFileURL(fromVgpu.resolve('@vgpu/wgsl/loader-vite')).href;
  const { wgslVitePlugin } = await import(loaderUrl);
  const { build } = await import('vite');
  await build({
    configFile: false, root, publicDir: false, base: '/',
    plugins: [wgslVitePlugin()],
    resolve: { alias: {
      '@gildrb/atmosphere-example/renderer': source.renderer,
      '@gildrb/atmosphere-example/tuning': source.tuning,
    } },
    build: {
      outDir: output, emptyOutDir: false, copyPublicDir: false, target: 'es2022',
      lib: {
        entry: path.join(root, 'src/atmosphere-background/main.mjs'),
        formats: ['es'],
        fileName: () => 'atmosphere-background.js',
        cssFileName: 'atmosphere-background',
      },
      rollupOptions: { output: { chunkFileNames: 'assets/atmosphere-[name]-[hash].js' } },
    },
  });
}
