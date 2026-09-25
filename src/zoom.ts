import { fadeDuration, spring } from "./entry.ts";

// Case-study images enlarge in place: a click grows the image from the text column to span the
// whole page container, over a backdrop in the page color; a click, Escape, scroll or resize
// sends it back. The page keeps its own image; a fixed-position copy does the moving.
//
// The motion is CSS transitions, not keyframes, so it is interruptible both ways: a new target
// takes over from wherever the image is, and a reversal is shortened to the distance already
// travelled. Clicking away mid-opening sends it straight back; clicking it mid-return reopens it.

const inset = 24;
const scrollTolerance = 40;
const backdropOpacity = "0.96";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

type Rect = { left: number; top: number; width: number; height: number };
type Pose = { transform: string; borderRadius: string };

type Zoomed = {
  button: HTMLButtonElement;
  image: HTMLImageElement;
  copy: HTMLImageElement;
  backdrop: HTMLDivElement;
  frame: Rect;
  radius: number;
  scrollY: number;
  closing: boolean;
};

let zoomed: Zoomed | undefined;

/** The largest box with the image's ratio that fits the page container and the viewport. */
function frameFor(image: HTMLImageElement): Rect | undefined {
  const container = image.closest("main")?.parentElement?.getBoundingClientRect();
  if (!container || image.width === 0 || image.height === 0) return undefined;
  const ratio = image.width / image.height;
  const width = Math.min(
    container.width,
    innerWidth - inset * 2,
    (innerHeight - inset * 2) * ratio,
  );
  const height = width / ratio;
  const left = Math.min(
    Math.max(container.left + (container.width - width) / 2, inset),
    innerWidth - inset - width,
  );
  return { left, top: (innerHeight - height) / 2, width, height };
}

/** Maps the enlarged frame onto `rect`, keeping the image's visible corner radius. */
function poseAt(rect: Rect, frame: Rect, radius: number): Pose {
  const scale = rect.width / frame.width;
  return {
    transform: `translate(${rect.left - frame.left}px, ${rect.top - frame.top}px) scale(${scale})`,
    borderRadius: `${radius / scale}px`,
  };
}

/** Moves to the given pose on the homepage entrance's spring; returns once nothing is moving. */
function settle(state: Zoomed, pose: Pose, opacity: string) {
  const duration = reducedMotion.matches ? 0 : fadeDuration;
  state.copy.style.transition = `transform ${duration}ms ${spring}, border-radius ${duration}ms ${spring}`;
  state.backdrop.style.transition = `opacity ${duration}ms ${spring}`;
  Object.assign(state.copy.style, pose);
  state.backdrop.style.opacity = opacity;
  // No transition starts when nothing changes or motion is reduced: finish a return right away.
  if (state.closing && state.copy.getAnimations().length === 0) restore(state);
}

function enlarge(button: HTMLButtonElement) {
  const image = button.querySelector("img");
  if (!image) return;
  const frame = frameFor(image);
  const rect = image.getBoundingClientRect();
  // Nothing to gain where the image already spans the container, as on phones.
  if (!frame || frame.width < rect.width * 1.1) return;

  const style = getComputedStyle(image);
  const radius = Number.parseFloat(style.borderTopLeftRadius);
  const start = poseAt(rect, frame, radius);
  const backdrop = document.createElement("div");
  backdrop.style.cssText = `position:fixed;inset:0;z-index:1000;cursor:zoom-out;opacity:0;background:${
    getComputedStyle(document.body).backgroundColor
  }`;

  // Starts from the file already on screen, then swaps in the sharpest one for the new size.
  const copy = document.createElement("img");
  copy.alt = "";
  copy.decoding = "async";
  copy.src = image.currentSrc || image.src;
  copy.style.cssText = [
    "position:fixed",
    "z-index:1001",
    "margin:0",
    "max-width:none",
    "cursor:zoom-out",
    "transform-origin:0 0",
    "will-change:transform",
    "user-select:none",
    `left:${frame.left}px`,
    `top:${frame.top}px`,
    `width:${frame.width}px`,
    `height:${frame.height}px`,
    `transform:${start.transform}`,
    `border-radius:${start.borderRadius}`,
    `filter:${style.filter}`,
  ].join(";");
  if (image.srcset) {
    const sharp = new Image();
    sharp.sizes = `${Math.ceil(frame.width)}px`;
    sharp.srcset = image.srcset;
    sharp.decode().then(
      () => {
        if (zoomed?.copy === copy && !zoomed.closing) copy.src = sharp.currentSrc;
      },
      // Undecodable: the copy keeps the file already on screen.
      () => undefined,
    );
  }

  document.body.append(backdrop, copy);
  image.style.visibility = "hidden";
  button.setAttribute("aria-expanded", "true");
  // Focus stays on the image's own button (Safari does not focus buttons on click), so keys act
  // on the enlargement and Tab carries on from where the reader is.
  button.focus({ preventScroll: true });
  const state: Zoomed = { button, image, copy, backdrop, frame, radius, scrollY, closing: false };
  zoomed = state;
  copy.addEventListener("transitionend", (event) => {
    if (event.propertyName === "transform" && state.closing) restore(state);
  });
  // Commit the starting pose, so the change below transitions from it.
  copy.getBoundingClientRect();
  settle(state, { transform: "none", borderRadius: `${radius}px` }, backdropOpacity);
}

function shrink() {
  if (!zoomed || zoomed.closing) return;
  const state = zoomed;
  state.closing = true;
  // Clicks now reach the page again: the image itself to reopen it, or any other to open that.
  state.copy.style.pointerEvents = "none";
  state.backdrop.style.pointerEvents = "none";
  settle(state, poseAt(state.image.getBoundingClientRect(), state.frame, state.radius), "0");
}

/** Sends a returning image back out, from wherever it has got to. */
function reopen(state: Zoomed) {
  state.closing = false;
  state.copy.style.pointerEvents = "";
  state.backdrop.style.pointerEvents = "";
  state.button.setAttribute("aria-expanded", "true");
  settle(state, { transform: "none", borderRadius: `${state.radius}px` }, backdropOpacity);
}

/** Puts the page's image back and drops the copy; safe to call twice. */
function restore(state: Zoomed) {
  state.copy.remove();
  state.backdrop.remove();
  state.image.style.visibility = "";
  state.button.setAttribute("aria-expanded", "false");
  if (zoomed === state) zoomed = undefined;
}

document.addEventListener("click", (event) => {
  if (zoomed && !zoomed.closing) {
    event.preventDefault();
    shrink();
    return;
  }
  const button = event.target instanceof Element ? event.target.closest("[data-zoom]") : null;
  if (!(button instanceof HTMLButtonElement)) return;
  if (zoomed?.button === button) {
    reopen(zoomed);
    return;
  }
  // Another image cuts the previous one's return short.
  if (zoomed) restore(zoomed);
  enlarge(button);
});

// Escape sends the image back; so does Tab, as focus leaves for content the backdrop covers.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.key === "Tab") shrink();
});

addEventListener(
  "scroll",
  () => {
    if (zoomed && Math.abs(scrollY - zoomed.scrollY) > scrollTolerance) shrink();
  },
  { passive: true },
);

addEventListener("resize", shrink);
