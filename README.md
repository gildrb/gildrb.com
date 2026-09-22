# gildrb.com

Gil Rodrigues's portfolio. Vite+, Preact and strict TypeScript, with prerendered pages and a VGPU sky background. Node.js 22.18 or newer is required.

```sh
npm ci
npm run dev
```

The `vp` executable comes from the locked Vite+ dependency. No global CLI is required. `npm run build` produces `dist/`; `npm run preview` serves that output. `npm run verify` runs formatting, type-aware lint, type checking, unit tests, the production build and output checks.

## Editing

`src/content/projects.ts` owns project titles, dates, scopes and destinations. The homepage, sorting, related-project links, page discovery and MCP tools consume it. Authored case copy is Markdown in `src/content/`; `media.json` describes the existing responsive media. Profile identity is in `src/data/profile.json`. Shared Preact components render the same content for prerendering and hydration.

The Preact Vite plugin prerenders the homepage, all-projects page, seven case studies and four informational pages. Case content is parsed at build time and loaded only on relevant routes. There are no duplicated HTML page templates or concatenated browser scripts.

## Environment

A small, genuine rendered sky image appears before JavaScript or WebGPU initialization. The live canvas fades in only after its first submitted frame completes. If WebGPU is missing or fails, the poster stays visible. The camera is fixed; the background never captures pointer input.

The live renderer adapts the official VGPU Atmosphere example into a sky-only graph. It omits terrain, shadow maps and terrain haze history. Smaller dimension-aware cloud/weather noise bakes reduce startup work. Upstream source and its MIT notice remain under `atmosphere/`; every original export hash is checked by the tests. Application code is TypeScript/TSX; GPU programs remain WGSL, styling CSS, and authored copy Markdown.

## Validation

```sh
npm run verify
npm exec --no -- playwright install chromium --only-shell --with-deps
npm run preview -- --host 127.0.0.1 --port 5175
# In another terminal:
npm run test:browser
npm exec --no -- vgpu install-software-renderer
npm run test:gpu
```

The browser suite checks preserved mobile/desktop layout, transparent headings, links, sorting, themes, prerendering without JavaScript, informational routes and the local Heph demo. It explicitly tests a delayed/failed GPU download while the sky remains visible. Native GPU tests execute the actual WGSL through Dawn and read back day, dusk and night images. Lifecycle tests use doubles and do not claim to validate shader pixels.

Cloudflare Pages functions remain under `functions/`, now typed. Vercel previews serve the static `dist/` output; the Cloudflare-specific API handlers are not Vercel functions. This branch does not change production routing or domains.

See [implementation notes](docs/rework.md) for measurements and limitations.
