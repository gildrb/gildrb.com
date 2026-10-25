import { spring, zoomDuration } from "./entry.ts";

// Case-study images and recordings enlarge in place: a click grows the artwork from the text
// column to span the whole page container, over a backdrop in the page color; a click, Escape,
// scroll or resize sends it back. The page keeps its own element; a fixed-position copy does the
// moving. A recording's copy is a second `<video>` of the same file, playing from where the page's
// one is; the page's one only turns invisible, so it plays on and is in step when the copy goes.
//
// The motion is CSS transitions, not keyframes, so it is interruptible both ways: a new target
// takes over from wherever the artwork is, and a reversal is shortened to the distance already
// travelled. Clicking away mid-opening sends it straight back; clicking it mid-return reopens it.

// The enlargement's margin from the viewport edge: one line (`space.sectionGap`, three units).
// Phones have no margin: the artwork spans the screen's width.
const inset = 24;
// How far the page may scroll under an enlargement before it goes back: one table row pitch (five
// units), so a trackpad's stray nudge keeps it open.
const scrollTolerance = 40;
// How far a finger must travel sideways, and more than it does up or down, to step to the next
// artwork: the same row pitch.
const swipeDistance = 40;
// The backdrop ends fully opaque: the page color itself, as every other surface over the page.
const backdropOpacity = "1";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
// `media.mobile`: the artwork already spans the column there, so it enlarges to the screen.
const phone = matchMedia("(max-width: 767px)");

type Rect = { left: number; top: number; width: number; height: number };
type Pose = { transform: string; clipPath: string };
type Media = HTMLImageElement | HTMLVideoElement;

type Zoomed = {
  button: HTMLButtonElement;
  media: Media;
  copy: Media;
  backdrop: HTMLDivElement;
  frame: Rect;
  radius: number;
  scrollY: number;
  /** Where the page stood when the return began; null while open. */
  returnY: number | null;
  closing: boolean;
};

let zoomed: Zoomed | undefined;

/** The artwork's own pixel size; a recording's size attributes stand in until its metadata loads. */
function sizeOf(media: Media): { width: number; height: number } {
  if (media instanceof HTMLImageElement) {
    return { width: media.naturalWidth, height: media.naturalHeight };
  }
  return media.videoWidth === 0
    ? { width: media.width, height: media.height }
    : { width: media.videoWidth, height: media.videoHeight };
}

/**
 * The largest box with the artwork's own ratio that fits the page container and the viewport; on
 * phones, the whole screen.
 */
function frameFor(media: Media): Rect | undefined {
  const size = sizeOf(media);
  if (size.width === 0 || size.height === 0) return undefined;
  const ratio = size.width / size.height;
  if (phone.matches) {
    const width = Math.min(innerWidth, innerHeight * ratio);
    const height = width / ratio;
    return { left: (innerWidth - width) / 2, top: (innerHeight - height) / 2, width, height };
  }
  const container = media.closest("main")?.parentElement?.getBoundingClientRect();
  if (!container) return undefined;
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

/** Where one `object-position` value puts the artwork: a share of the free space, or pixels. */
function offset(value: string, free: number): number {
  return value.endsWith("%") ? (free * Number.parseFloat(value)) / 100 : Number.parseFloat(value);
}

/**
 * The whole artwork's box on the page and the part of it that shows. A banner or tile crops its
 * artwork (`object-fit: cover`); the enlargement starts from that crop and opens to the whole.
 */
function artworkOf(media: Media): { artwork: Rect; shown: Rect } {
  const shown = media.getBoundingClientRect();
  const style = getComputedStyle(media);
  const fit = style.objectFit;
  if (fit !== "cover" && fit !== "contain") return { artwork: shown, shown };
  const size = sizeOf(media);
  const scales = [shown.width / size.width, shown.height / size.height];
  const scale = fit === "cover" ? Math.max(...scales) : Math.min(...scales);
  const width = size.width * scale;
  const height = size.height * scale;
  const [x = "50%", y = "50%"] = style.objectPosition.split(" ");
  const artwork = {
    left: shown.left + offset(x, shown.width - width),
    top: shown.top + offset(y, shown.height - height),
    width,
    height,
  };
  return { artwork, shown: fit === "cover" ? shown : artwork };
}

/**
 * Maps the enlarged frame onto the artwork on the page: the whole artwork scaled onto its box
 * there, clipped to the part that shows, with the element's visible corner radius.
 */
function poseAt(media: Media, frame: Rect, radius: number): Pose {
  const { artwork, shown } = artworkOf(media);
  const scale = artwork.width / frame.width;
  const top = Math.max(0, shown.top - artwork.top) / scale;
  const left = Math.max(0, shown.left - artwork.left) / scale;
  const bottom = Math.max(0, artwork.top + artwork.height - shown.top - shown.height) / scale;
  const right = Math.max(0, artwork.left + artwork.width - shown.left - shown.width) / scale;
  return {
    transform: `translate(${artwork.left - frame.left}px, ${artwork.top - frame.top}px) scale(${scale})`,
    clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius / scale}px)`,
  };
}

/** The enlarged pose: the whole artwork, unclipped. */
function openPose(radius: number): Pose {
  return { transform: "none", clipPath: `inset(0px 0px 0px 0px round ${radius}px)` };
}

/** Moves to the given pose on the site's spring; returns once nothing is moving. */
function settle(state: Zoomed, pose: Pose, opacity: string) {
  const duration = reducedMotion.matches ? 0 : zoomDuration;
  state.copy.style.transition = `transform ${duration}ms ${spring}, clip-path ${duration}ms ${spring}`;
  state.backdrop.style.transition = `opacity ${duration}ms ${spring}`;
  Object.assign(state.copy.style, pose);
  state.backdrop.style.opacity = opacity;
  // No transition starts when nothing changes or motion is reduced: finish a return right away.
  if (state.closing && state.copy.getAnimations().length === 0) restore(state);
}

/** A copy of the page's image: the file already on screen, then the sharpest one for the new size. */
function copyImage(image: HTMLImageElement, width: number): HTMLImageElement {
  const copy = document.createElement("img");
  copy.alt = "";
  copy.decoding = "async";
  copy.src = image.currentSrc || image.src;
  if (image.srcset) {
    const sharp = new Image();
    sharp.sizes = `${Math.ceil(width)}px`;
    sharp.srcset = image.srcset;
    sharp.decode().then(
      () => {
        if (zoomed?.copy === copy && !zoomed.closing) copy.src = sharp.currentSrc;
      },
      // Undecodable: the copy keeps the file already on screen.
      () => undefined,
    );
  }
  return copy;
}

/**
 * A copy of the page's recording, taken up from where that one is. Like the page's own
 * (`video.ts`), it stands still on its poster when reduced motion is asked for.
 */
function copyVideo(video: HTMLVideoElement): HTMLVideoElement {
  const copy = document.createElement("video");
  copy.setAttribute("aria-hidden", "true");
  copy.src = video.currentSrc || video.src;
  copy.poster = video.poster;
  copy.muted = true;
  copy.loop = true;
  copy.playsInline = true;
  copy.autoplay = !reducedMotion.matches;
  copy.currentTime = video.currentTime;
  return copy;
}

/**
 * Enlarges the artwork in `button`. Returns whether it did: nothing happens to an artwork that is
 * not shown, nor, on desktop, where the whole artwork already spans the container. Phones always
 * enlarge it to the screen. Stepping from another enlargement (`over`) keeps that one's backdrop
 * and shows the new artwork in place at once, as a slideshow does; a fresh enlargement grows out
 * of the page.
 */
function enlarge(button: HTMLButtonElement, over?: Zoomed): boolean {
  const media = button.querySelector("img, video");
  if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) return false;
  if (media.getClientRects().length === 0) return false;
  const frame = frameFor(media);
  if (!frame) return false;
  const { artwork, shown } = artworkOf(media);
  const cropped = artwork.width > shown.width + 1 || artwork.height > shown.height + 1;
  if (!phone.matches && !cropped && frame.width < artwork.width * 1.1) return false;

  const style = getComputedStyle(media);
  const radius = Number.parseFloat(style.borderTopLeftRadius);
  const start = over ? openPose(radius) : poseAt(media, frame, radius);
  const backdrop = over?.backdrop ?? document.createElement("div");
  if (!over) {
    backdrop.style.cssText = `position:fixed;inset:0;z-index:1000;cursor:zoom-out;opacity:0;background:${
      getComputedStyle(document.body).backgroundColor
    }`;
  }

  const copy = media instanceof HTMLImageElement ? copyImage(media, frame.width) : copyVideo(media);
  // As the page's own artwork (`markdown.tsx`): it cannot be dragged off the page.
  copy.draggable = false;
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
    `clip-path:${start.clipPath}`,
    `filter:${style.filter}`,
  ].join(";");

  if (over) {
    over.copy.replaceWith(copy);
    if (over.copy instanceof HTMLVideoElement) over.copy.pause();
    over.media.style.visibility = "";
    over.button.setAttribute("aria-expanded", "false");
  } else {
    document.body.append(backdrop, copy);
  }
  media.style.visibility = "hidden";
  button.setAttribute("aria-expanded", "true");
  // Focus stays on the artwork's own button (Safari does not focus buttons on click), so keys act
  // on the enlargement and Tab carries on from where the reader is.
  button.focus({ preventScroll: true });
  const state: Zoomed = {
    button,
    media,
    copy,
    backdrop,
    frame,
    radius,
    scrollY,
    returnY: null,
    closing: false,
  };
  zoomed = state;
  copy.addEventListener("transitionend", (event: Event) => {
    if (!(event instanceof TransitionEvent)) return;
    if (event.propertyName === "transform" && state.closing) restore(state);
  });
  if (over) return true;
  // Commit the starting pose, so the change below transitions from it.
  copy.getBoundingClientRect();
  settle(state, openPose(radius), backdropOpacity);
  return true;
}

/**
 * Steps the enlargement to the next (or previous) artwork on the page, in reading order, skipping
 * any that cannot enlarge. The page scrolls so the new artwork's own place is in view, which is
 * where it returns to; that scroll is the enlargement's own, not a reason to close.
 */
function step(state: Zoomed, direction: 1 | -1) {
  const buttons = [...document.querySelectorAll("[data-zoom]")].filter(
    (element): element is HTMLButtonElement => element instanceof HTMLButtonElement,
  );
  let index = buttons.indexOf(state.button) + direction;
  while (index >= 0 && index < buttons.length) {
    const button = buttons[index];
    if (button === undefined) return;
    button.scrollIntoView({ behavior: "instant", block: "nearest" });
    if (enlarge(button, state)) {
      if (zoomed) zoomed.scrollY = scrollY;
      return;
    }
    index += direction;
  }
  // No further artwork that way: the page is back where the current one is.
  state.button.scrollIntoView({ behavior: "instant", block: "nearest" });
  state.scrollY = scrollY;
}

/**
 * Sends the artwork back to its place on the page. The copy leaves the viewport for the page
 * itself: it scrolls with the page, so a scroll during the return (or the one that set it off)
 * carries the copy along and it lands on its artwork wherever that has gone.
 */
function shrink() {
  if (!zoomed || zoomed.closing) return;
  const state = zoomed;
  state.closing = true;
  state.returnY = scrollY;
  // Clicks now reach the page again: the artwork itself to reopen it, or any other to open that.
  state.copy.style.pointerEvents = "none";
  state.backdrop.style.pointerEvents = "none";
  state.copy.style.position = "absolute";
  state.copy.style.left = `${state.frame.left + scrollX}px`;
  state.copy.style.top = `${state.frame.top + scrollY}px`;
  settle(state, poseAt(state.media, state.frame, state.radius), "0");
}

/**
 * Sends a returning artwork back out, from wherever it has got to. Returns whether it could: once
 * the page has scrolled, the copy no longer stands where the enlargement opens.
 */
function reopen(state: Zoomed): boolean {
  if (state.returnY !== scrollY) return false;
  state.closing = false;
  state.returnY = null;
  state.copy.style.pointerEvents = "";
  state.backdrop.style.pointerEvents = "";
  state.copy.style.position = "fixed";
  state.copy.style.left = `${state.frame.left}px`;
  state.copy.style.top = `${state.frame.top}px`;
  state.button.setAttribute("aria-expanded", "true");
  settle(state, openPose(state.radius), backdropOpacity);
  return true;
}

/** Puts the page's artwork back and drops the copy; safe to call twice. */
function restore(state: Zoomed) {
  if (state.copy instanceof HTMLVideoElement) state.copy.pause();
  state.copy.remove();
  state.backdrop.remove();
  state.media.style.visibility = "";
  state.button.setAttribute("aria-expanded", "false");
  if (zoomed === state) zoomed = undefined;
}

/** Listens for artwork clicks and for everything that sends an enlarged artwork back. */
export function enableZoom() {
  document.addEventListener("click", (event) => {
    if (zoomed && !zoomed.closing) {
      event.preventDefault();
      shrink();
      return;
    }
    const button = event.target instanceof Element ? event.target.closest("[data-zoom]") : null;
    if (!(button instanceof HTMLButtonElement)) return;
    if (zoomed?.button === button && reopen(zoomed)) return;
    // Another artwork, or this one once the page has moved, cuts the previous return short.
    if (zoomed) restore(zoomed);
    enlarge(button);
  });

  // Escape sends the artwork back; so does Tab, as focus leaves for content the backdrop covers.
  // Left and right (or h and l, as in Vim) step through the page's artworks while one is enlarged;
  // on a touch screen, a swipe to the left or right does.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.key === "Tab") shrink();
    if (!zoomed || zoomed.closing || event.altKey || event.ctrlKey || event.metaKey) return;
    const direction =
      event.key === "ArrowRight" || event.key === "l"
        ? 1
        : event.key === "ArrowLeft" || event.key === "h"
          ? -1
          : 0;
    if (direction === 0) return;
    event.preventDefault();
    step(zoomed, direction);
  });

  let touch: { x: number; y: number } | undefined;
  document.addEventListener(
    "touchstart",
    (event) => {
      const point = event.touches[0];
      touch =
        zoomed && !zoomed.closing && event.touches.length === 1 && point
          ? { x: point.clientX, y: point.clientY }
          : undefined;
    },
    { passive: true },
  );
  // Not passive (a document's touch listeners are passive unless told otherwise): a sideways move
  // is the swipe's, not the browser's (its swipe back through the history, or a sideways pan).
  document.addEventListener(
    "touchmove",
    (event) => {
      const point = event.touches[0];
      if (!touch || !point) return;
      if (Math.abs(point.clientX - touch.x) > Math.abs(point.clientY - touch.y)) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
  // Not passive: a swipe that steps cancels the tap that would send the artwork back.
  document.addEventListener("touchend", (event) => {
    const start = touch;
    const point = event.changedTouches[0];
    touch = undefined;
    if (!start || !point || !zoomed || zoomed.closing) return;
    const dx = point.clientX - start.x;
    if (Math.abs(dx) < swipeDistance || Math.abs(dx) <= Math.abs(point.clientY - start.y)) return;
    event.preventDefault();
    step(zoomed, dx < 0 ? 1 : -1);
  });

  addEventListener(
    "scroll",
    () => {
      if (zoomed && Math.abs(scrollY - zoomed.scrollY) > scrollTolerance) shrink();
    },
    { passive: true },
  );

  addEventListener("resize", shrink);
}
