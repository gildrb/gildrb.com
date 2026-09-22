import { init, target, type Gpu, type Target } from "vgpu/node";
import { createSkyGraph, type Size } from "../src/environment/graph";
import { localSkyState } from "../src/environment/state";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import assert from "node:assert/strict";

await fs.mkdir("validation", { recursive: true });
let gpu: Gpu | undefined;
let output: Target | undefined;
let graph: Awaited<ReturnType<typeof createSkyGraph>> | undefined;
const results = [];
try {
  const start = performance.now();
  gpu = await init();
  const adapterMs = performance.now() - start;
  const size: Size = [390, 844];
  output = target(gpu, { size, format: "rgba8unorm", label: "rework-validation" });
  let state = localSkyState({}, new Date(2026, 8, 22, 17, 28), 8);
  const graphStart = performance.now();
  graph = await createSkyGraph(gpu, output, state);
  const createMs = performance.now() - graphStart;
  graph.render(8);
  await gpu.gpu.queue.onSubmittedWorkDone();
  await gpu.settled();
  const firstFrameMs = performance.now() - graphStart;
  results.push({
    type: "startup",
    adapterMs,
    createMs,
    firstFrameMs,
    resources: graph.resources,
    size,
  });
  for (const [name, hour, minute] of [
    ["day", 12, 0],
    ["dusk", 17, 59],
    ["night", 0, 0],
  ] as const) {
    state = localSkyState({}, new Date(2026, 8, 22, hour, minute), 8);
    graph.prepare(state);
    for (let i = 0; i < 33; i++) {
      graph.render(8);
      await gpu.gpu.queue.onSubmittedWorkDone();
    }
    await gpu.settled();
    const [pixels, dry] = await Promise.all([
      output.color.read({ mipLevel: 0, region: "all" }),
      graph.sky.color.read({ mipLevel: 0, region: "all" }),
    ]);
    const png = new PNG({ width: size[0], height: size[1] });
    png.data.set(pixels);
    await fs.writeFile(`validation/${name}.png`, PNG.sync.write(png));
    const luma: number[] = [];
    let changed = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      luma.push(0.2126 * pixels[i]! + 0.7152 * pixels[i + 1]! + 0.0722 * pixels[i + 2]!);
      if (
        Math.max(
          Math.abs(pixels[i]! - dry[i]!),
          Math.abs(pixels[i + 1]! - dry[i + 1]!),
          Math.abs(pixels[i + 2]! - dry[i + 2]!),
        ) >= 3
      )
        changed++;
    }
    luma.sort((a, b) => a - b);
    const range = luma[Math.floor(luma.length * 0.9)]! - luma[Math.floor(luma.length * 0.1)]!;
    results.push({
      type: "frame",
      name,
      hour,
      minute,
      size,
      range,
      rainFraction: changed / luma.length,
    });
    console.log(results.at(-1));
    assert.ok(range > 5, `${name}: cloud field must have visible tonal range (${range})`);
    assert.ok(changed / luma.length > 0.002, `${name}: rain must change pixels`);
    if (name === "dusk") {
      graph.render(8.2);
      await gpu.gpu.queue.onSubmittedWorkDone();
      await gpu.settled();
      const moved: Uint8Array = await output.color.read({ mipLevel: 0, region: "all" });
      assert.ok(
        moved.some((value, index) => Math.abs(value - pixels[index]!) > 2),
        "Rain/cloud animation must change frame",
      );
    }
  }
  output.resize([960, 600]);
  graph.resize(output.size);
  for (const [name, hour, minute] of [
    ["day", 12, 0],
    ["dusk", 17, 59],
    ["night", 0, 0],
  ] as const) {
    graph.prepare(localSkyState({}, new Date(2026, 8, 22, hour, minute), 8));
    for (let i = 0; i < 17; i++) {
      graph.render(8);
      await gpu.gpu.queue.onSubmittedWorkDone();
    }
    await gpu.settled();
    const wide = new PNG({ width: output.size[0], height: output.size[1] });
    wide.data.set(await output.color.read({ mipLevel: 0, region: "all" }));
    await fs.writeFile(`validation/${name}-wide.png`, PNG.sync.write(wide));
  }
  output.resize([720, 450]);
  graph.resize(output.size);
  graph.prepare(localSkyState({}, new Date(2026, 8, 22, 12), 8));
  graph.render(8);
  await gpu.gpu.queue.onSubmittedWorkDone();
  await gpu.settled();
  assert.equal((await output.color.read({ mipLevel: 0, region: "all" })).length, 720 * 450 * 4);
  console.log(results[0]);
} finally {
  await fs.writeFile(
    "validation/gpu.json",
    JSON.stringify({ backend: "vgpu/node", measurements: results }, null, 2),
  );
  graph?.dispose();
  graph?.dispose();
  output?.color.destroy();
  gpu?.dispose();
}
