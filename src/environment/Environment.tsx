import { useEffect, useRef } from "preact/hooks";
import "./environment.css";

/** The actual sky is visible from prerendered HTML, before JavaScript or GPU startup. */
export function Environment() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !navigator.gpu || !isSecureContext) return;
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    const started = performance.now();
    void import("./runtime")
      .then(async ({ startEnvironment }) => {
        if (controller.signal.aborted) return;
        const release = await startEnvironment(element, controller.signal, started);
        if (controller.signal.aborted) release();
        else dispose = release;
      })
      .catch((error) => {
        element.dataset.status = "fallback";
        console.warn("Live atmosphere unavailable; keeping the sky poster.", error);
      });
    return () => {
      controller.abort();
      dispose?.();
    };
  }, []);
  return (
    <div class="environment" aria-hidden="true">
      <div class="environment-poster" />
      <canvas ref={canvas} id="gildrb-atmosphere-background" data-status="loading" />
      <div class="environment-veil" />
    </div>
  );
}
