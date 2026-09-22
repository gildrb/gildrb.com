import { build } from 'vite';
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite';
await build({configFile:false,plugins:[wgslVitePlugin()],build:{ssr:'tests/render-real.mjs',outDir:'.test-build',rollupOptions:{external:[/^vgpu(?:\/.*)?$/],output:{entryFileNames:'render-real.mjs'}}}});
