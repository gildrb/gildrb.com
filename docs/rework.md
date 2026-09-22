# Rework

## What changed

The site uses locked Vite+ 1.0.0-rc.0, Preact 10.29.8, TypeScript 7.0.2 and VGPU 0.5.0. The Vite+ release is the version returned by the stable npm tag when this workspace was installed; it is pinned, not silently upgraded on each build. VGPU remains on the version used by the verified Atmosphere export. Its local documentation and version-neutral upstream skill were read before adapting the graph.

A single typed registry and shared Preact components replace the duplicated page templates, string-substitution builder, copied case-navigation lists and concatenated browser scripts. The existing authored case text and responsive assets are retained. The Heph terminal keeps its local scripted evidence interaction. Formatting, type-aware lint, strict type checking, testing, development and production builds run through the project-local Vite+ toolchain. Public pages are prerendered rather than requiring JavaScript for their content.

The name and project labels have transparent backgrounds. Mobile scroll fades use a CSS opacity mask on the scrolling content, not black painted overlays. A single translucent background veil preserves readable foreground text. No trees, terrain, new controls or mouse-following camera are added.

## Startup

First visible sky and live GPU readiness are separate events. The first paint uses a checked-in WebP generated from the actual VGPU graph, with mobile and desktop versions for day, dusk and night. These are still images, not a second pretend renderer. The real canvas replaces the poster only after its submitted frame finishes. Unsupported devices and failed downloads keep the image and the functional portfolio.

The active graph does not import the original demo's renderer, GUI or benchmark modules. It retains the original atmospheric scattering, volumetric cloud march, temporal resolve and presentation kernels, but removes all terrain and shadow allocations. The shape noise bake is 64 cubed instead of 128 cubed; the weather field is 256 squared instead of 1024 squared. The two adapted generator entrypoints query their storage dimensions and reuse the original noise functions. This is a deliberate background-resolution tradeoff: 87.5% fewer shape-noise invocations and 93.75% fewer weather-map invocations, not a claim of identical pixels. Original vendored files are unchanged and checked against the verified hashes.

The canvas caps device resolution, limits frame submission to one in-flight frame, pauses in hidden documents and converges a stationary image under reduced motion. Resize invalidates history and rebinds textures. Cancellation, initialization failure and device loss dispose resources; a late initialization result cannot take ownership after unmounting.

## Measured locally

On this VM's Dawn/Mesa CPU renderer at 390 by 844, the original full graph took 5.51 seconds from graph creation to the first completed frame. The smaller graph took 1.16 seconds in a later run, including 0.80 seconds creating the graph. These are single local measurements, not controlled phone benchmarks; caching and system load can affect them. They do not establish an iPhone frame rate or guarantee network load time. Pixel tests separately confirmed cloud tonal variation, visible rain, changed animated frames and resized render targets.

Production output checks enforce a 25 KB gzip budget for initial application JavaScript, 110 KB for the lazy live-renderer module and 25 KB per first-paint image. The measured initial application JavaScript was approximately 10.8 KB gzip and the live module approximately 77.5 KB gzip before final formatting. The former prototype loaded roughly 124 KB gzip of graphics code. `validation/output.json` records the exact current build numbers.

Browser tests record poster resource completion on localhost without treating that as a mobile network measurement. A separate test delays the live-renderer download by 1.5 seconds, verifies the sky is already visible, then fails that request and checks that the poster remains. The suite also loads prerendered pages with JavaScript disabled.

## Boundaries

The VM executed real WebGPU shaders through Dawn's software adapter. Browser checks ran desktop Chromium at mobile and desktop viewport sizes. Physical iPhone/Safari GPU startup, battery use, sustained frame rate and low-memory behavior still require device testing. The poster is a fallback and first-paint aid, not evidence that a device successfully started WebGPU.

The original Cloudflare API behavior is retained in typed handlers and request tests. A Vercel static preview does not execute Cloudflare Pages functions. No production domain, primary branch or access-control setting is changed by this rework.
