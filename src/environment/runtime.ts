import { init, surface, type Gpu, type Surface } from "vgpu";
import { createSkyGraph, type Size } from "./graph";
import { localSkyState } from "./state";

export function bufferSize(width: number, height: number): Size {
  const scale = Math.min(
    1,
    1280 / Math.max(1, width),
    1_000_000 ** 0.5 / Math.sqrt(Math.max(1, width * height)),
  );
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}
/** A single owner, one in-flight GPU frame, no pointer handlers and no unbounded GPU queue. */
export async function startEnvironment(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  started = performance.now(),
): Promise<() => void> {
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let graph: Awaited<ReturnType<typeof createSkyGraph>> | undefined;
  let disposed = false;
  let raf = 0;
  let pending = false;
  let time = 8;
  let last = 0;
  let remaining = 17;
  let observer: ResizeObserver | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    observer?.disconnect();
    clearInterval(timer);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("pageshow", wake);
    motion.removeEventListener("change", wake);
    signal.removeEventListener("abort", cleanup);
    gpu?.gpu.removeEventListener("uncapturederror", onGpuError);
    try {
      graph?.dispose();
    } finally {
      try {
        output?.dispose();
      } finally {
        gpu?.dispose();
      }
    }
  };
  const fail = (error: unknown) => {
    if (disposed) return;
    canvas.dataset.status = "fallback";
    cleanup();
    console.warn("Atmosphere stopped; keeping the sky poster.", error);
  };
  function onGpuError(event: GPUUncapturedErrorEvent) {
    fail(event.error);
  }
  function hide() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function wake() {
    last = 0;
    remaining = 17;
    if (!disposed && !raf && document.visibilityState !== "hidden")
      raf = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    raf = 0;
    if (disposed || document.visibilityState === "hidden" || !gpu || !graph || !output) {
      last = 0;
      return;
    }
    if (pending || now - last < 1000 / 30) {
      raf = requestAnimationFrame(tick);
      return;
    }
    try {
      const size = bufferSize(canvas.clientWidth, canvas.clientHeight);
      if (size[0] !== output.size[0] || size[1] !== output.size[1]) {
        output.resize(size);
        graph.resize(size);
        remaining = 17;
      }
      if (!motion.matches && last) time += Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const date = new Date();
      const hour = date.getHours();
      document.documentElement.dataset.sky =
        hour < 6 || hour >= 21 ? "night" : hour < 8 || hour >= 17 ? "dusk" : "day";
      graph.prepare(localSkyState({}, date, time));
      graph.render(time);
      remaining = Math.max(0, remaining - 1);
      pending = true;
      const queue = gpu.gpu.queue;
      void queue.onSubmittedWorkDone().then(() => {
        pending = false;
        if (disposed) return;
        if (canvas.dataset.status !== "ready") {
          canvas.dataset.status = "ready";
          performance.measure("environment-gpu-ready", { start: started, end: performance.now() });
          canvas.dataset.readyMs = String(Math.round(performance.now() - started));
        }
        if (!motion.matches || remaining > 0) wakeFrame();
      }, fail);
    } catch (error) {
      fail(error);
    }
  }
  function wakeFrame() {
    if (!disposed && !raf && document.visibilityState !== "hidden")
      raf = requestAnimationFrame(tick);
  }
  try {
    gpu = await init();
    if (signal.aborted) {
      cleanup();
      return cleanup;
    }
    signal.addEventListener("abort", cleanup, { once: true });
    output = surface(gpu, canvas, {
      autoResize: false,
      size: bufferSize(canvas.clientWidth, canvas.clientHeight),
      alphaMode: "opaque",
    });
    gpu.gpu.addEventListener("uncapturederror", onGpuError);
    void gpu.gpu.lost.then((info) => {
      if (!disposed) fail(new Error(`GPU device lost: ${info.message}`));
    });
    const created = await createSkyGraph(gpu, output, localSkyState({}, new Date(), time));
    if (disposed || signal.aborted) {
      created.dispose();
      cleanup();
      return cleanup;
    }
    graph = created;
    observer = new ResizeObserver(wake);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", wake);
    motion.addEventListener("change", wake);
    timer = setInterval(() => {
      if (motion.matches) wake();
    }, 60_000);
    wake();
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}
