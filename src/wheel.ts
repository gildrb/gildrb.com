// Wide screens show two scrolling columns side by side: the page and the archive beside it
// (`SideArchive`). Left to itself, a browser scrolls whatever a wheel gesture started on for the
// whole gesture, momentum included, so a scroll can stay in the column the pointer has left.
// While the archive column shows, each wheel event therefore scrolls what is under the pointer
// at that moment, and nothing else: reaching a column's end never moves the other one.

/** Pixels per line, for wheels that report lines (Firefox with a mouse). */
const lineHeight = 40;

type Axis = "x" | "y";

function scrolls(element: Element, axis: Axis): boolean {
  const style = getComputedStyle(element);
  const overflow = axis === "y" ? style.overflowY : style.overflowX;
  if (overflow !== "auto" && overflow !== "scroll") return false;
  return axis === "y"
    ? element.scrollHeight > element.clientHeight
    : element.scrollWidth > element.clientWidth;
}

/** The innermost element under the point that scrolls along `axis`, else the page. */
function scrollerAt(x: number, y: number, axis: Axis): Element | null {
  for (
    let element = document.elementFromPoint(x, y);
    element !== null && element !== document.documentElement;
    element = element.parentElement
  ) {
    if (scrolls(element, axis)) return element;
  }
  return document.scrollingElement;
}

function pixels(delta: number, mode: number, page: number): number {
  if (mode === WheelEvent.DOM_DELTA_LINE) return delta * lineHeight;
  if (mode === WheelEvent.DOM_DELTA_PAGE) return delta * page;
  return delta;
}

export function routeWheel() {
  const column = document.querySelector("[data-side-archive]");
  if (column === null) return;
  addEventListener(
    "wheel",
    (event) => {
      // Pinch and ctrl-wheel zoom the page; below the wide layout the column is hidden.
      if (event.ctrlKey || event.defaultPrevented || column.getClientRects().length === 0) return;
      // Shift turns a vertical wheel sideways, as browsers do on their own.
      const sideways = event.shiftKey && event.deltaX === 0;
      const deltas: [Axis, number][] = [
        ["x", sideways ? event.deltaY : event.deltaX],
        ["y", sideways ? 0 : event.deltaY],
      ];
      event.preventDefault();
      for (const [axis, delta] of deltas) {
        if (delta === 0) continue;
        const scroller = scrollerAt(event.clientX, event.clientY, axis);
        if (scroller === null) continue;
        const page = axis === "y" ? scroller.clientHeight : scroller.clientWidth;
        const distance = pixels(delta, event.deltaMode, page);
        // Instant: the page's smooth scrolling is for in-page links, and would lag the wheel.
        const offset = axis === "y" ? { top: distance } : { left: distance };
        scroller.scrollBy({ ...offset, behavior: "instant" });
      }
    },
    { passive: false },
  );
}
