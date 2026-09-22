# Official Atmosphere & Clouds example

Source: https://vgpu.sh/examples/atmosphere

Acquired on 2026-09-22 with `npx vgpu examples pull atmosphere --out ./atmosphere`. The review branch repeats the pull with an explicit immutable revision.

Verified export: 32 files, 160,994 bytes, revision `6fa27bb458ffc3f498727090f09dce3fe5faabb43689fd669d633a2a23dc36bb`, aggregate SHA-256 `cd254bf76627b3e9ced8bf35b3d1cfde8eb390f3262f9dd1c9a2116b04c64d2c`.

All 32 files remain byte-identical. `original-files.sha256.json` records individual hashes; `verified-pull.json` records the CLI receipt.

The export omitted `bench.ts` despite `renderer.ts` dynamically importing it. The exact file was supplemented from `vercel-labs/vgpu` commit `80f98da2f5cb6bb089744c0fe96c97231af202a7`, path `apps/docs/examples/atmosphere/bench.ts`, and checked against Git blob SHA-1 `b061d5e5efe5e9f4eaa09a778a1022e27d90d96b`. The corresponding MIT license is included. Demo controls and benchmark UI are not mounted by the site integration.

The dependency lock selects `vgpu@0.5.0` and `lil-gui@0.21.0`. Integration was developed against that package's bundled documentation. Runtime additions and art direction live separately in `src/atmosphere-background/`.
