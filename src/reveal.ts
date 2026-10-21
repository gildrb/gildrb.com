import { animate } from "motion/mini";

/**
 * Article images still loading fade in as they arrive, instead of popping into an empty box. An
 * image already loaded is never hidden, so nothing waits for this script.
 */
export function revealImages(): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const image of document.querySelectorAll<HTMLImageElement>("main img")) {
    if (image.complete) continue;
    image.style.opacity = "0";
    const show = () => image.style.removeProperty("opacity");
    image.addEventListener(
      "load",
      () =>
        void animate(image, { opacity: [0, 1] }, { duration: 0.2, ease: [0.2, 0, 0, 1] }).then(
          show,
        ),
      { once: true },
    );
    image.addEventListener("error", show, { once: true });
  }
}
