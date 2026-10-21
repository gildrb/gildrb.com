/**
 * Every image and recording marked `data-arrive`, on every page, is held invisible until it can be
 * drawn whole, then shown one of two ways, the same everywhere:
 *
 * - Ready by the first frame, or read from the browser cache: shown at once. The sidebar and any
 *   page seen before never blink between two pages.
 * - Arriving later over the network: faded in (`arriveCss`), never drawn in pieces.
 *
 * Runs inline in the `<head>` before any of them exists, and watches the document, so tiles built by
 * the sidebar script and images added by islands follow the same rule. Without JavaScript nothing
 * is held. Self-contained with `cached` and `loaded`: `arriveScript` inlines the three.
 */
export function arrive(): void {
  const root = document.documentElement;
  root.setAttribute("data-arriving", "");
  let painted = false;
  requestAnimationFrame(() => {
    painted = true;
  });
  const show = (element: Element, url: string) =>
    element.setAttribute("data-arrive", painted && !cached(url) ? "fade" : "shown");
  // Decoding can fail (a broken file); the element is shown anyway, as the browser draws it.
  const settle = (element: Element, image: HTMLImageElement) =>
    void loaded(image)
      .then(() => image.decode())
      .catch(() => undefined)
      .then(() => show(element, image.currentSrc || image.src));
  const watch = (element: Element) => {
    if (element.getAttribute("data-arrive") !== "") return;
    element.setAttribute("data-arrive", "waiting");
    if (element instanceof HTMLImageElement) settle(element, element);
    else if (element instanceof HTMLVideoElement && element.poster !== "") {
      // A poster has no load event of its own: load the same file as an image, from the cache the
      // video shares. A frame that plays first also shows the video.
      const poster = new Image();
      poster.src = element.poster;
      settle(element, poster);
      element.addEventListener("loadeddata", () => show(element, element.currentSrc), {
        once: true,
      });
    } else element.setAttribute("data-arrive", "shown");
  };
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.hasAttribute("data-arrive")) watch(node);
        for (const element of node.querySelectorAll("[data-arrive]")) watch(element);
      }
    }
  }).observe(root, { childList: true, subtree: true });
}

/** Same-origin files report how they came: nothing transferred but a body decoded means the cache. */
export function cached(url: string): boolean {
  return performance
    .getEntriesByName(url)
    .some(
      (entry) =>
        entry instanceof PerformanceResourceTiming &&
        entry.transferSize === 0 &&
        entry.decodedBodySize > 0,
    );
}

/** Resolves once the image has its file, or failed to get it. */
export function loaded(image: HTMLImageElement): Promise<void> {
  if (image.complete) return Promise.resolve();
  const { promise, resolve } = Promise.withResolvers<void>();
  image.addEventListener("load", () => resolve(), { once: true });
  image.addEventListener("error", () => resolve(), { once: true });
  return promise;
}

/** The three functions, inlined into every page's `<head>`, then run. */
export const arriveScript = `${cached.toString()};${loaded.toString()};(${arrive.toString()})()`;

/**
 * The fade itself, with the rest of the site's motion: ease-out, no overshoot. Longer than an
 * interaction's 200ms: nothing waits on it, and a slow fade reads as arrival, not as a flicker.
 * Reduced motion shows the file at once.
 */
export const arriveCss = [
  "html[data-arriving] [data-arrive]:is([data-arrive=''],[data-arrive=waiting]){opacity:0}",
  "@keyframes arrive{from{opacity:0}}",
  "@media (prefers-reduced-motion:no-preference){[data-arrive=fade]{animation:arrive 400ms cubic-bezier(0.2,0,0,1)}}",
].join("\n");
