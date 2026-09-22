import { beforeEach, afterEach, describe, expect, it, vi } from "vite-plus/test";
import { bufferSize, startEnvironment } from "../src/environment/runtime";

const mocked = vi.hoisted(() => ({ init: vi.fn(), surface: vi.fn(), createGraph: vi.fn() }));
vi.mock("vgpu", () => ({ init: mocked.init, surface: mocked.surface }));
vi.mock("../src/environment/graph", () => ({ createSkyGraph: mocked.createGraph }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(reduced = false) {
  const lost = deferred<Pick<GPUDeviceLostInfo, "message" | "reason">>();
  const fence = vi.fn(() => Promise.resolve());
  const device = Object.assign(new EventTarget(), {
    queue: { onSubmittedWorkDone: fence },
    lost: lost.promise,
  });
  const gpu = { gpu: device, dispose: vi.fn() };
  const canvas = {
    clientWidth: 390,
    clientHeight: 844,
    dataset: { status: "loading" },
  } as unknown as HTMLCanvasElement;
  const doc = Object.assign(new EventTarget(), {
    visibilityState: "visible",
    documentElement: { dataset: {} },
  });
  const host = new EventTarget();
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  const output = {
    size: [390, 844],
    dispose: vi.fn(),
    resize: vi.fn((size: readonly number[]) => {
      output.size = [...size];
    }),
  };
  const graph = { dispose: vi.fn(), prepare: vi.fn(), render: vi.fn(), resize: vi.fn() };
  const disconnect = vi.fn();
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", host);
  vi.stubGlobal("matchMedia", () => motion);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect = disconnect;
    },
  );
  mocked.init.mockResolvedValue(gpu);
  mocked.surface.mockReturnValue(output);
  mocked.createGraph.mockResolvedValue(graph);
  const controller = new AbortController();
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };
  const tick = async (time = performance.now() + 100) => {
    const next = frames.entries().next().value;
    if (next) {
      frames.delete(next[0]);
      next[1](time);
    }
    await flush();
  };
  return {
    canvas,
    controller,
    gpu,
    device,
    doc,
    motion,
    frames,
    output,
    graph,
    disconnect,
    fence,
    lost,
    tick,
    flush,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("bounded environment lifecycle (test doubles, not GPU pixel tests)", () => {
  it("caps mobile/desktop pixel buffers without supersampling", () => {
    expect(bufferSize(390, 844)).toEqual([390, 844]);
    const size = bufferSize(3840, 2160);
    expect(size[0]).toBeLessThanOrEqual(1280);
    expect(size[0] * size[1]).toBeLessThanOrEqual(1_001_000);
  });
  it("keeps the poster until a submitted frame actually finishes", async () => {
    const h = setup();
    const gate = deferred<void>();
    h.fence.mockReturnValue(gate.promise);
    const stop = await startEnvironment(h.canvas, h.controller.signal);
    await h.tick();
    expect(h.canvas.dataset.status).toBe("loading");
    gate.resolve();
    await h.flush();
    expect(h.canvas.dataset.status).toBe("ready");
    stop();
  });
  it("never queues another GPU frame while one is in flight", async () => {
    const h = setup();
    const gate = deferred<void>();
    h.fence.mockReturnValue(gate.promise);
    const stop = await startEnvironment(h.canvas, h.controller.signal);
    await h.tick();
    await h.tick(500);
    await h.tick(1000);
    expect(h.graph.render).toHaveBeenCalledTimes(1);
    gate.resolve();
    await h.flush();
    stop();
  });
  it("converges reduced-motion stills, then stops and can resume", async () => {
    const h = setup(true);
    const stop = await startEnvironment(h.canvas, h.controller.signal);
    for (let i = 0; i < 20; i++) await h.tick(100 + i * 100);
    expect(h.graph.render).toHaveBeenCalledTimes(17);
    expect(h.frames.size).toBe(0);
    expect(h.graph.render.mock.calls.every((call) => call[0] === 8)).toBe(true);
    h.motion.dispatchEvent(new Event("change"));
    for (let i = 0; i < 18; i++) await h.tick(3000 + i * 100);
    expect(h.graph.render).toHaveBeenCalledTimes(34);
    stop();
  });
  it("does not render while hidden and disposes once", async () => {
    const h = setup();
    h.doc.visibilityState = "hidden";
    const stop = await startEnvironment(h.canvas, h.controller.signal);
    expect(h.frames.size).toBe(0);
    h.doc.visibilityState = "visible";
    h.doc.dispatchEvent(new Event("visibilitychange"));
    await h.tick();
    expect(h.graph.render).toHaveBeenCalledTimes(1);
    stop();
    stop();
    expect(h.graph.dispose).toHaveBeenCalledTimes(1);
    expect(h.output.dispose).toHaveBeenCalledTimes(1);
    expect(h.gpu.dispose).toHaveBeenCalledTimes(1);
    expect(h.disconnect).toHaveBeenCalledTimes(1);
  });
  it("releases a graph which finishes initializing after cancellation", async () => {
    const h = setup();
    const delayed = deferred<typeof h.graph>();
    mocked.createGraph.mockReturnValue(delayed.promise);
    const ready = startEnvironment(h.canvas, h.controller.signal);
    await h.flush();
    h.controller.abort();
    delayed.resolve(h.graph);
    await ready;
    expect(h.graph.dispose).toHaveBeenCalledTimes(1);
    expect(h.gpu.dispose).toHaveBeenCalledTimes(1);
    expect(h.frames.size).toBe(0);
  });
  it("rebinds resized targets and reports device loss without hiding the poster", async () => {
    const h = setup();
    const stop = await startEnvironment(h.canvas, h.controller.signal);
    Object.defineProperty(h.canvas, "clientWidth", { value: 320 });
    await h.tick();
    expect(h.graph.resize).toHaveBeenCalledWith([320, 844]);
    h.lost.resolve({ message: "test device loss", reason: "unknown" });
    await h.flush();
    expect(h.canvas.dataset.status).toBe("fallback");
    expect(h.gpu.dispose).toHaveBeenCalledTimes(1);
    stop();
  });
});
