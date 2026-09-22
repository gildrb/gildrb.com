import { localSkyState } from './state.mjs';

/**
 * Adapter around the official example. Its render graph is not copied or rewritten.
 * Dependencies are explicit so lifecycle tests do not pretend to execute WebGPU.
 */
export function createBackgroundStart({
  vgpu, atmosphere, preset, shaders, host = window, doc = document,
  onReady = () => {}, onFailure = () => {},
  dateNow = () => new Date(), perfNow = () => performance.now(),
}) {
  return async function start(canvas) {
    const cleanupStack = [];
    let disposed = false;
    let loop;
    let failed = false;
    let frameCount = 0;
    let simulationTime = 8;
    let lastTime;
    let settleFrames = 0;
    let inFlight = false;
    const motion = host.matchMedia('(prefers-reduced-motion: reduce)');

    function dispose() {
      if (disposed) return;
      disposed = true;
      loop?.stop();
      loop = undefined;
      const errors = [];
      for (const release of cleanupStack.splice(0).reverse()) {
        try { release(); } catch (error) { errors.push(error); }
      }
      if (errors.length) console.warn('Atmosphere cleanup errors', errors);
    }
    function fail(error) {
      if (disposed || failed) return;
      failed = true;
      // Do not destroy resources in the middle of a frame being encoded.
      queueMicrotask(() => { dispose(); onFailure(error); });
    }

    try {
      const gpu = await vgpu.init();
      cleanupStack.push(() => gpu.dispose());
      const onGpuError = event => fail(event.error ?? new Error('Uncaptured WebGPU error'));
      gpu.gpu.addEventListener('uncapturederror', onGpuError);
      cleanupStack.push(() => gpu.gpu.removeEventListener('uncapturederror', onGpuError));
      const surface = vgpu.surface(gpu, canvas, { dpr: 1 });
      cleanupStack.push(() => surface.dispose());
      const sky = vgpu.target(gpu, { size: surface.size, format: 'rgba8unorm', label: 'gildrb-atmosphere-sky' });
      cleanupStack.push(() => sky.colors.forEach(color => color.destroy()));
      const rainySky = vgpu.target(gpu, { size: surface.size, format: 'rgba8unorm', label: 'gildrb-atmosphere-rain' });
      cleanupStack.push(() => rainySky.colors.forEach(color => color.destroy()));
      const graph = await atmosphere.createGraph(gpu, sky, 'gildrb-atmosphere');
      cleanupStack.push(() => atmosphere.destroyGraph(graph));
      graph.accumulate = true;

      const linearSampler = vgpu.sampler(gpu, {
        minFilter: 'linear', magFilter: 'linear',
        addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
      });
      const copy = vgpu.effect(gpu, shaders.copy, {
        set: { scene: sky, linearSampler }, label: 'gildrb-sky-copy',
      });
      const rain = vgpu.draw(gpu, {
        shader: shaders.rain,
        label: 'gildrb-rain-drops',
        geometry: { topology: 'triangle-list', vertexCount: 6 },
        blend: 'alpha',
        set: {
          scene: sky, linearSampler,
          params: { size: [...surface.size], time: simulationTime, shutter: 1 / 65 },
        },
      });
      const lens = vgpu.effect(gpu, shaders.lens, {
        label: 'gildrb-wet-lens',
        set: {
          scene: rainySky, linearSampler,
          params: { size: [...surface.size], time: simulationTime, wetness: 0.58 },
        },
      });
      await Promise.all([copy.compile(rainySky), rain.compile(rainySky), lens.compile({ colors: [surface.format] })]);

      function stop() {
        loop?.stop();
        loop = undefined;
        lastTime = undefined;
      }
      function render(frame) {
        if (disposed || failed || inFlight || doc.visibilityState === 'hidden') return;
        try {
          const now = perfNow();
          if (!motion.matches && lastTime !== undefined) {
            simulationTime += Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
          }
          lastTime = now;
          atmosphere.applyState(graph, localSkyState(preset, dateNow(), simulationTime), sky.size);
          atmosphere.renderGraph(frame, graph, sky);
          rain.set({ params: { time: simulationTime } });
          lens.set({ params: { time: simulationTime } });
          frame.pass({ target: rainySky, clear: [0, 0, 0, 1] }, pass => {
            pass.draw(copy);
            pass.draw(rain, { instances: 6800 });
          });
          frame.pass(surface, lens);
          frameCount += 1;
          // Defer the fence until vgpu has submitted this frame's command buffer.
          // This bounds queued work on slow adapters without changing the render graph.
          if (gpu.gpu.queue?.onSubmittedWorkDone) {
            inFlight = true;
            queueMicrotask(() => {
              if (disposed) return;
              gpu.gpu.queue.onSubmittedWorkDone().then(() => { inFlight = false; }, fail);
            });
          }
          if (motion.matches && --settleFrames <= 0) stop();
          if (frameCount === 1) onReady({ backend: 'vgpu-webgpu', camera: 'fixed-zenith' });
        } catch (error) { fail(error); }
      }
      function startLoop() {
        if (disposed || failed || loop || doc.visibilityState === 'hidden') return;
        settleFrames = Math.max(16, atmosphere.CLOUD_CONVERGENCE_FRAMES ?? 16);
        lastTime = undefined;
        loop = vgpu.frameLoop(gpu, render, { fps: 30 });
      }
      const unsubscribeResize = surface.onResize(() => {
        if (disposed || failed) return;
        try {
          const size = surface.size;
          if (sky.size[0] !== size[0] || sky.size[1] !== size[1]) {
            sky.resize(size);
            rainySky.resize(size);
            atmosphere.resizeGraph(graph, size);
            copy.set({ scene: sky });
            rain.set({ scene: sky, params: { size: [...size] } });
            lens.set({ scene: rainySky, params: { size: [...size] } });
          }
          settleFrames = Math.max(16, atmosphere.CLOUD_CONVERGENCE_FRAMES ?? 16);
          startLoop();
        } catch (error) { fail(error); }
      });
      cleanupStack.push(unsubscribeResize);
      function onVisibility() {
        if (doc.visibilityState === 'hidden') stop();
        else startLoop();
      }
      function onMotion() { stop(); startLoop(); }
      doc.addEventListener('visibilitychange', onVisibility);
      cleanupStack.push(() => doc.removeEventListener('visibilitychange', onVisibility));
      motion.addEventListener('change', onMotion);
      cleanupStack.push(() => motion.removeEventListener('change', onMotion));
      // A stopped reduced-motion loop cannot poll surface auto-resize.
      host.addEventListener('resize', startLoop, { passive: true });
      cleanupStack.push(() => host.removeEventListener('resize', startLoop));
      const timer = host.setInterval(() => {
        if (motion.matches && !disposed && doc.visibilityState !== 'hidden') startLoop();
      }, 60_000);
      cleanupStack.push(() => host.clearInterval(timer));
      gpu.gpu.lost.then(info => {
        if (!disposed) fail(new Error(`WebGPU device lost: ${info.message}`));
      }).catch(fail);
      startLoop();
      return dispose;
    } catch (error) {
      dispose();
      throw error;
    }
  };
}
