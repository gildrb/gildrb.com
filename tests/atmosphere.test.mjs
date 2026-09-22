import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { localSkyState } from '../src/atmosphere-background/state.mjs';
import { createBackgroundStart } from '../src/atmosphere-background/runtime.mjs';
import { addAtmosphereHooks, STYLE, SCRIPT, IMPORT, BUILD } from '../scripts/atmosphere-hooks.mjs';
import { discoverAtmosphere } from '../scripts/atmosphere-source.mjs';

const date = (hour, minute = 0, second = 0) => new Date(2026, 8, 22, hour, minute, second);
test('local clock distinguishes noon from night', () => {
  assert.ok(localSkyState({}, date(12)).sunElevation > 50);
  assert.ok(localSkyState({}, date(0)).sunElevation < 0);
});
test('camera is identical at every hour', () => {
  for (let hour = 0; hour < 24; hour++) {
    const state = localSkyState({}, date(hour));
    assert.equal(state.yaw, 0); assert.equal(state.pitch, 75); assert.equal(state.altitudeKm, .08);
  }
});
test('sub-minute clock updates do not invalidate lighting history', () => {
  assert.deepEqual(localSkyState({}, date(13, 1, 0)), localSkyState({}, date(13, 1, 59)));
});
test('preset and native tonemapping settings are preserved without mutating input', () => {
  const preset = Object.freeze({ custom: 17, pitch: 0 });
  const state = localSkyState(preset, date(12), 3.2);
  assert.equal(state.custom, 17); assert.equal(state.tonemap, 'agx'); assert.equal(state.time, 3.2);
  assert.equal(preset.pitch, 0);
});
test('invalid dates fail clearly', () => assert.throws(() => localSkyState({}, new Date(NaN)), TypeError));

const template = '<!doctype html>\n<html>\n    <head>\n        <title>Gil Rodrigues (gildrb)</title>\n    </head>\n    <body id="top">\n<!-- @include:partials/sidebar.html -->\n<!-- @include:sections/profile-summary.html -->\n<!-- @include:sections/portfolio-design.html -->\n    </body>\n</html>\n';
const builder = 'import path from "node:path";\nexport async function buildPage({ write = true, output } = {}) {\n    return {\n        allPage,\n        indexHtml,\n    };\n}\n';
test('template and builder are byte-identical after removing only the asset tags and hook', () => {
  const result = addAtmosphereHooks(template, builder);
  assert.equal(result.template.replace(STYLE, '').replace(SCRIPT, ''), template);
  assert.equal(result.builder.replace(IMPORT, '').replace(BUILD, ''), builder);
  assert.equal(result.template.split('<body')[1].replace(SCRIPT, ''), template.split('<body')[1]);
});
test('duplicate integration is rejected', () => {
  const result = addAtmosphereHooks(template, builder);
  assert.throws(() => addAtmosphereHooks(result.template, result.builder), /already exist/);
});
test('unknown build structure is rejected instead of rewriting the app', () => {
  assert.throws(() => addAtmosphereHooks(template, 'export const build = 1;'), /exactly one/);
});
test('no pointer handlers, demo controls, or portfolio CSS selectors are introduced', async () => {
  const main = await readFile(new URL('../src/atmosphere-background/main.mjs', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../src/atmosphere-background/runtime.mjs', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/atmosphere-background/background.css', import.meta.url), 'utf8');
  assert.doesNotMatch(main + runtime, /addEventListener\(['"](?:mouse|pointer|touch|keydown)/);
  assert.doesNotMatch(main + runtime, /installControls\s*\(/);
  assert.doesNotMatch(css, /\.(?:sidebar|wrapper|layout|name|links|portfolio)\b/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /z-index:\s*-1/);
});

/** Lifecycle test doubles, NOT a WebGPU renderer or shader validator. */
function harness({ stage, hidden = false, reduced = false } = {}) {
  const log = [], loops = [], states = [], effects = [], targets = [];
  const doc = new EventTarget(); doc.visibilityState = hidden ? 'hidden' : 'visible';
  const motion = new EventTarget(); motion.matches = reduced;
  const timers = new Map(); let counter = 0, ms = 0;
  const host = Object.assign(new EventTarget(), { matchMedia: () => motion, setInterval: fn => { timers.set(++counter, fn); return counter; }, clearInterval: id => timers.delete(id) });
  const device = new EventTarget(); let lose;
  device.lost = new Promise(resolve => { lose = resolve; });
  const gpu = { gpu: device, dispose: () => log.push('gpu.dispose') };
  let resizeCallback;
  const surface = {
    size: [1280, 720], format: 'bgra8unorm',
    onResize(fn) { resizeCallback = fn; fn(); return () => { resizeCallback = undefined; log.push('resize.unsubscribe'); }; },
    dispose() { log.push('surface.dispose'); },
  };
  const vgpu = {
    async init() { if (stage === 'init') throw new Error('init failed'); return gpu; },
    surface() { return surface; },
    sampler() { return {}; },
    target(_gpu, opts) {
      const target = { size: [...opts.size], colors: [{ destroy: () => log.push(opts.label + '.destroy') }], resize(size) { this.size = [...size]; } };
      targets.push(target); return target;
    },
    effect(_gpu, shader, options) {
      const effect = { shader, options, sets: [], set(value) { this.sets.push(value); }, async compile() { if (stage === 'compile') throw new Error('compile failed'); } };
      effects.push(effect); return effect;
    },
    draw(_gpu, options) { return this.effect(_gpu, options.shader, options); },
    frameLoop(_gpu, callback) { const item = { callback, active: true, stop() { this.active = false; log.push('loop.stop'); } }; loops.push(item); return item; },
  };
  const atmosphere = {
    CLOUD_CONVERGENCE_FRAMES: 16,
    async createGraph() { if (stage === 'graph') throw new Error('graph failed'); return {}; },
    destroyGraph() { log.push('graph.destroy'); },
    resizeGraph(_graph, size) { log.push('graph.resize:' + size.join('x')); },
    applyState(_graph, state) { states.push(state); },
    renderGraph() { if (stage === 'frame') throw new Error('frame failed'); log.push('graph.render'); },
  };
  let failure, ready;
  const start = createBackgroundStart({ vgpu, atmosphere, preset: {}, shaders: { copy: 'copy', rain: 'rain', lens: 'lens' }, host, doc, perfNow: () => ms, dateNow: () => date(13), onReady: value => ready = value, onFailure: error => failure = error });
  return {
    start, log, loops, states, effects, targets, timers, motion, doc, surface, device, lose,
    get failure() { return failure; }, get ready() { return ready; },
    tick(delta = 34) { ms += delta; const current = loops.findLast(loop => loop.active); current?.callback({ pass(target, callback) { if (typeof callback === 'function') callback({ draw() {} }); } }); },
    resize(w, h) { surface.size = [w, h]; resizeCallback?.(); },
  };
}
test('uses the official graph followed by the GPU rain passes', async () => {
  const h = harness(); const stop = await h.start({}); h.tick();
  assert.ok(h.log.includes('graph.render')); assert.equal(h.ready.backend, 'vgpu-webgpu');
  assert.equal(h.states[0].pitch, 75); assert.equal(h.effects.length, 3); stop();
});
test('cleanup is idempotent and releases the graph, extra targets, surface and GPU', async () => {
  const h = harness(); const stop = await h.start({}); stop(); stop();
  assert.equal(h.log.filter(s => s === 'gpu.dispose').length, 1);
  assert.equal(h.log.filter(s => s === 'graph.destroy').length, 1);
  assert.equal(h.log.filter(s => s.endsWith('.destroy')).length, 3);
  assert.equal(h.log.at(-1), 'gpu.dispose'); assert.equal(h.timers.size, 0);
});
test('initialization failure leaves no allocated resources', async () => {
  const h = harness({ stage: 'init' }); await assert.rejects(h.start({}), /init failed/); assert.deepEqual(h.log, []);
});
test('failed graph creation releases earlier allocations', async () => {
  const h = harness({ stage: 'graph' }); await assert.rejects(h.start({}), /graph failed/);
  assert.ok(h.log.includes('surface.dispose')); assert.equal(h.log.at(-1), 'gpu.dispose');
});
test('shader compilation failure releases the upstream graph', async () => {
  const h = harness({ stage: 'compile' }); await assert.rejects(h.start({}), /compile failed/);
  assert.ok(h.log.includes('graph.destroy')); assert.equal(h.log.at(-1), 'gpu.dispose');
});
test('hidden tabs start no render loop', async () => {
  const h = harness({ hidden: true }); const stop = await h.start({}); assert.equal(h.loops.length, 0); stop();
});
test('visibility pause/resume does not advance animation by time spent hidden', async () => {
  const h = harness(); const stop = await h.start({}); h.tick(); h.tick();
  const before = h.states.at(-1).time;
  h.doc.visibilityState = 'hidden'; h.doc.dispatchEvent(new Event('visibilitychange')); h.tick(500_000);
  h.doc.visibilityState = 'visible'; h.doc.dispatchEvent(new Event('visibilitychange')); h.tick();
  assert.equal(h.states.at(-1).time, before); stop();
});
test('reduced motion converges a stationary image then stops', async () => {
  const h = harness({ reduced: true }); const stop = await h.start({});
  for (let i = 0; i < 20; i++) h.tick();
  assert.equal(h.states.length, 16); assert.equal(new Set(h.states.map(state => state.time)).size, 1);
  assert.ok(h.loops.every(loop => !loop.active)); stop();
});
test('resize rebinds targets and upstream history', async () => {
  const h = harness(); const stop = await h.start({}); h.resize(390, 844);
  assert.ok(h.log.includes('graph.resize:390x844')); assert.deepEqual(h.targets[0].size, [390, 844]);
  assert.deepEqual(h.effects[2].sets.at(-1).params.size, [390, 844]); stop();
});
test('a reduced-motion still redraws after resize', async () => {
  const h = harness({ reduced: true }); const stop = await h.start({});
  for (let i = 0; i < 16; i++) h.tick(); h.resize(320, 568); h.tick();
  assert.equal(h.states.length, 17); stop();
});
test('device loss removes resources and reports a failure', async () => {
  const h = harness(); await h.start({}); h.lose({ reason: 'unknown', message: 'test loss' });
  await new Promise(resolve => setImmediate(resolve));
  assert.match(h.failure.message, /device lost/); assert.equal(h.log.at(-1), 'gpu.dispose');
});
test('uncaptured GPU errors stop the renderer', async () => {
  const h = harness(); await h.start({}); const event = new Event('uncapturederror'); event.error = new Error('test validation error');
  h.device.dispatchEvent(event); await new Promise(resolve => setImmediate(resolve));
  assert.match(h.failure.message, /validation error/); assert.equal(h.log.at(-1), 'gpu.dispose');
});
test('frame encoding errors do not leave an active animation loop', async () => {
  const h = harness({ stage: 'frame' }); await h.start({}); h.tick(); await new Promise(resolve => setImmediate(resolve));
  assert.ok(h.loops.every(loop => !loop.active)); assert.match(h.failure.message, /frame failed/);
});
test('missing official source fails closed', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'atmosphere-missing-'));
  try { await assert.rejects(discoverAtmosphere(dir), /official example is missing/); }
  finally { await rm(dir, { recursive: true, force: true }); }
});
test('discovery checks the full local import closure, not only renderer.ts', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'atmosphere-source-'));
  const base = path.join(dir, 'atmosphere', 'nested'); await mkdir(base, { recursive: true });
  const exports = ['createRenderer', 'createGraph', 'applyState', 'renderGraph', 'resizeGraph', 'destroyGraph'].map(name => `export function ${name}() {}`).join('\n');
  try {
    await writeFile(path.join(base, 'renderer.ts'), "import shader from './missing.wgsl';\n" + exports);
    await writeFile(path.join(base, 'tuning.ts'), 'export const PRESETS = {};');
    await assert.rejects(discoverAtmosphere(dir), /Incomplete download/);
    await writeFile(path.join(base, 'missing.wgsl'), '// Test fixture, not the official shader.');
    const info = await discoverAtmosphere(dir); assert.equal(info.closure, 3); assert.equal(info.files, 3);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
