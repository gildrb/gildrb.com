# Atmosphere background prototype

The existing website is the foreground. No new interface, cards, typography, controls, trees, camera controls or mouse-following behavior are introduced. Only the homepage loads the additional background assets. Case-study pages remain unchanged.

`atmosphere/` contains the complete verified VGPU Atmosphere & Clouds export, with its omitted upstream `bench.ts` dependency and MIT license supplemented. All original 32 files are untouched and covered by SHA-256 tests.

`src/atmosphere-background/` calls upstream `createRenderer`, `createGraph`, `applyState`, `renderGraph`, `resizeGraph` and `destroyGraph`. Atmospheric scattering tables, 3D cloud noise, volumetric cloud marching, temporal history, tone mapping and resource destructors remain the official implementation.

A fixed 89.9-degree upward camera shows the sky. Device-local time changes lighting once per minute so cloud history can converge between updates. This is an artistic 24-hour cycle, not a weather forecast or location-specific sunrise calculation.

Additional WebGPU passes draw world-space falling drops and small refracting lens caps. They approximate shutter blur and water optics, not a fluid simulation or a claim of photorealism. There are no Canvas substitutes. The canvas remains behind the original DOM with pointer events disabled and restrained opacity. The original light/dark theme continues to work.

The adapter caps DPR at 1 and scheduling at 30 FPS, bounds queued GPU work, pauses hidden tabs, and converges a fixed-time still for reduced motion. Cleanup stops the loop, removes listeners and timers, releases added textures and the upstream graph, then disposes the surface and GPU. Failure retains the original plain background. WebGPU is required for animation.

## Build and test

```sh
npm ci
npm run build
npm run dev
node --test tests/atmosphere*.test.mjs
node tests/build-real.mjs
npx vgpu doctor
node .test-build/render-real.mjs
```

Two asset tags are the only homepage-template edits. The static builder bundles the background separately. Vite also watches the vendored example and invalidates transformed generated modules after rebuilding, avoiding stale shaders during development.

Unit tests cover lifecycle and source invariants, not shader execution. Separate native WebGPU rendering through `vgpu/node` and Dawn/Mesa CPU rendering completed in the VM, including the official graph and all added rain passes. This is not a mock or Canvas renderer. Pixel captures are made after convergence and the fixed-camera terrain count is checked.

The portable Chromium/SwiftShader browser in the VM loses its device under this workload. The adapter handles that failure by restoring the original background. Successful native rendering does not establish browser rendering or hardware performance. Safari/iPhone and actual hardware remain unverified.

The existing `npm run verify` fails its Mobile Links/Contact spacing assertion both on the untouched baseline `7c3c527363fabf1fa9ecfb53a5667c44d7646cba` and this branch. No existing UI or verification assertion was changed to hide that failure. `npm run build` and its agent-readiness checks pass.
