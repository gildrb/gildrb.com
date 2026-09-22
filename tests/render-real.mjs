import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { init, target, effect, draw, sampler, frame } from 'vgpu/node';
import { createGraph, applyState, bakeLuts, renderGraph, destroyGraph } from '../atmosphere/renderer.ts';
import { PRESETS, DEFAULT_PRESET } from '../atmosphere/tuning.ts';
import { localSkyState } from '../src/atmosphere-background/state.mjs';
import copyWgsl from '../src/atmosphere-background/copy.wgsl';
import rainWgsl from '../src/atmosphere-background/rain.wgsl';
import lensWgsl from '../src/atmosphere-background/lens.wgsl';
import { PNG } from 'pngjs';

mkdirSync('validation', {recursive:true});
const size = [Number(process.env.RENDER_WIDTH || 720), Number(process.env.RENDER_HEIGHT || 450)];
const hour = Number(process.env.RENDER_HOUR || 16);
const minute = Number(process.env.RENDER_MINUTE || 0);
const name = process.env.RENDER_NAME || 'render';
assert.match(name, /^[a-zA-Z0-9_-]+$/);
assert.ok(size.every(x => Number.isInteger(x) && x >= 1 && x <= 3840));
const gpu = await init();
let graph;
const sky = target(gpu, {size,format:'rgba8unorm'});
const wet = target(gpu, {size,format:'rgba8unorm'});
const output = target(gpu, {size,format:'rgba8unorm'});
try {
  graph = await createGraph(gpu,sky,'test-official-atmosphere');
  const samp = sampler(gpu,{minFilter:'linear',magFilter:'linear'});
  const copy = effect(gpu,copyWgsl,{set:{scene:sky,linearSampler:samp}});
  const rain = draw(gpu,{shader:rainWgsl,vertices:6,blend:'alpha',set:{scene:sky,linearSampler:samp,params:{size,time:8,shutter:1/65}}});
  const lens = effect(gpu,lensWgsl,{set:{scene:wet,linearSampler:samp,params:{size,time:8,wetness:.58}}});
  await Promise.all([copy.compile(wet),rain.compile(wet),lens.compile(output)]);
  const state = localSkyState(PRESETS[DEFAULT_PRESET],new Date(2026,8,22,hour,minute),8);
  applyState(graph,state,size);
  bakeLuts(gpu,graph);
  for(let i=0;i<17;i++) {
    frame(gpu,f=>{
      renderGraph(f,graph,sky);
      f.pass({target:wet,clear:[0,0,0,1]},p=>{p.draw(copy);p.draw(rain,{instances:6800});});
      f.pass(output,lens);
    });
    await gpu.gpu.queue.onSubmittedWorkDone();
    await gpu.settled();
  }
  const [pixels, skyPixels] = await Promise.all([
    output.color.read({mipLevel:0,region:'all'}),
    sky.color.read({mipLevel:0,region:'all'}),
  ]);
  assert.equal(graph.terrainColumns, 0, 'Fixed upward camera must exclude terrain');
  assert.equal(pixels.length, size[0] * size[1] * 4);
  assert.ok(pixels.some((v,i) => i % 4 !== 3 && v > 0), 'Render must not be blank');
  const luma = [];
  let changed = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    luma.push(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
    if (Math.max(
      Math.abs(pixels[i] - skyPixels[i]),
      Math.abs(pixels[i + 1] - skyPixels[i + 1]),
      Math.abs(pixels[i + 2] - skyPixels[i + 2]),
    ) >= 3) changed += 1;
  }
  luma.sort((a,b) => a-b);
  const p10 = luma[Math.floor(luma.length * 0.10)];
  const p90 = luma[Math.floor(luma.length * 0.90)];
  assert.ok(p90 - p10 >= 8, `Cloud field needs visible tonal separation; got ${(p90-p10).toFixed(2)}`);
  assert.ok(changed / luma.length >= 0.002, `Rain/lens needs visible changed pixels; got ${(changed/luma.length).toFixed(4)}`);
  const png = new PNG({width:size[0],height:size[1]});
  png.data.set(pixels);
  writeFileSync(`validation/${name}.png`,PNG.sync.write(png));
  writeFileSync(`validation/${name}.json`,JSON.stringify({size,hour,minute,state,terrainColumns:graph.terrainColumns,backend:'vgpu/node',status:'passed'},null,2));
} finally {
  if(graph) destroyGraph(graph);
  for(const t of [sky,wet,output])t.color.destroy();
  gpu.dispose();
}
