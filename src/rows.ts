import { smear } from "./smear.ts";

function rowOf(event: Event): Element | null {
  return event.target instanceof Element ? event.target.closest("a") : null;
}

/**
 * The homepage table's row square (`Portfolio`): it marks the row under the pointer or in focus,
 * in the column where other lists show →, smears from row to row (`smear.ts`) and fades only as it
 * leaves. Plain DOM on the server-rendered table, so it works the moment the script runs, before
 * the table hydrates; a pointer already resting on a row is marked at once. Phones hide the rows'
 * square cells (`Row`), and a row without one is never marked.
 */
export function trackRows() {
  const box = document.querySelector<HTMLElement>("[data-rows]");
  const square = box?.querySelector<HTMLElement>("[data-row-square]");
  if (!box || !square) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const motion = smear(square);
  let current: Element | null = null;
  const hide = () => {
    current = null;
    square.style.transitionDuration = "";
    square.style.opacity = "0";
  };
  const mark = (row: Element | null) => {
    const cell = row?.querySelector("[data-row-mark]");
    if (!row || !cell || row === current) return;
    if (cell.getClientRects().length === 0) {
      hide();
      return;
    }
    const from = box.getBoundingClientRect();
    const at = cell.getBoundingClientRect();
    const target = {
      x: at.left - from.left + (at.width - square.offsetWidth) / 2,
      y: at.top - from.top + (at.height - square.offsetHeight) / 2,
    };
    if (current !== null && !still.matches) motion.move(target);
    else motion.jump(target);
    current = row;
    square.style.transitionDuration = "0s";
    square.style.opacity = "1";
  };
  // `pointermove` too: `pointerover` does not fire for a pointer that was already on a row.
  box.addEventListener("pointerover", (event) => mark(rowOf(event)));
  box.addEventListener("pointermove", (event) => mark(rowOf(event)));
  box.addEventListener("focusin", (event) => mark(rowOf(event)));
  box.addEventListener("pointerleave", hide);
  box.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && box.contains(event.relatedTarget)) return;
    hide();
  });
  // Sorting reorders the rows under a resting pointer: follow it to the row now there.
  box.addEventListener("click", () =>
    requestAnimationFrame(() => {
      const hovered = box.querySelector("a:hover");
      current = null;
      if (hovered) mark(hovered);
    }),
  );
  mark(box.querySelector("a:hover"));
}
