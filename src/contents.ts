type Point = { x: number; y: number };

/** One edge of the square, top or bottom: where its left corner is and how fast it moves. */
type Edge = Point & { vx: number; vy: number };

/** A damped spring: stiffness in 1/s² (per unit mass) and the damping ratio, 1 being critical. */
type Spring = { stiffness: number; damping: number };

/**
 * How the square moves to a new part, like a smeared cursor: its two edges are separate springs.
 * The edge in front pulls hard and settles with a little give; the edge behind follows softer and,
 * critically damped, never passes it. Between them the square smears into a bar, slanted when the
 * words end at different places, and draws together beside the new link. Each edge keeps its speed
 * when the target changes mid-move, so a new part bends the motion instead of restarting it.
 */
const lead: Spring = { stiffness: 700, damping: 0.75 };
const trail: Spring = { stiffness: 240, damping: 1 };

/** The springs' time step: small enough for the stiffest one to stay stable. */
const substep = 1 / 240;

/** The longest frame gap simulated; after a stalled tab the square catches up, it does not leap. */
const longestFrame = 1 / 20;

/** How close, in px and px/s, an edge must be to its target and to rest to count as settled. */
const rest = { distance: 0.05, speed: 0.5 };

/** The space between a link's last letter and the square. */
const spacing = 8;

/** Moves an edge toward `to` along its spring for `dt` seconds (semi-implicit Euler). */
function pull(edge: Edge, to: Point, spring: Spring, dt: number): void {
  const friction = 2 * spring.damping * Math.sqrt(spring.stiffness);
  edge.vx += (spring.stiffness * (to.x - edge.x) - friction * edge.vx) * dt;
  edge.vy += (spring.stiffness * (to.y - edge.y) - friction * edge.vy) * dt;
  edge.x += edge.vx * dt;
  edge.y += edge.vy * dt;
}

function settled(edge: Edge, to: Point): boolean {
  return (
    Math.abs(to.x - edge.x) < rest.distance &&
    Math.abs(to.y - edge.y) < rest.distance &&
    Math.hypot(edge.vx, edge.vy) < rest.speed
  );
}

/**
 * Marks the part of the page being read in its contents list (`aside.tsx`). The square stands still
 * just right of the part's link text and only moves when the reader reaches another part: it
 * smears there, and the link turns to full contrast. A move that starts during another one
 * carries on from where the square is and how fast it goes, so it never jumps. Positions are
 * measured from the links'
 * text, so the square stays beside its words at any font size. A click scrolls to its part without
 * adding a history entry, so Back leaves the page.
 */
export function trackContents(): void {
  const nav = document.querySelector<HTMLElement>("[data-contents]");
  const marker = nav?.querySelector<HTMLElement>("[data-contents-marker]");
  if (!nav || !marker) return;
  const parts = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].flatMap((link) => {
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    return heading ? [{ link, heading }] : [];
  });
  if (parts.length === 0) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let current = -1;
  let queued = false;
  const top: Edge = { x: 0, y: 0, vx: 0, vy: 0 };
  const bottom: Edge = { x: 0, y: 0, vx: 0, vy: 0 };
  let springs = { top: lead, bottom: trail };
  let target: Point = { x: 0, y: 0 };
  let frame = 0;
  let last = 0;

  /**
   * Draws the square between its edges: the top edge's corner is the origin, the bottom edge sets
   * the height and the slant. If a turn mid-move brings the edges closer than a third of the
   * square, it stays that thick rather than folding over.
   */
  const draw = () => {
    const size = marker.offsetHeight;
    const slant = (bottom.x - top.x) / size;
    const height = Math.max(bottom.y + size - top.y, size / 3) / size;
    marker.style.transform = `matrix(1, 0, ${slant}, ${height}, ${top.x}, ${top.y})`;
  };

  /** Puts the square at the target at once, at rest. */
  const jump = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    Object.assign(top, target, { vx: 0, vy: 0 });
    Object.assign(bottom, target, { vx: 0, vy: 0 });
    draw();
  };

  const tick = (now: number) => {
    let left = Math.min((now - last) / 1000, longestFrame);
    last = now;
    while (left > 0) {
      const dt = Math.min(left, substep);
      pull(top, target, springs.top, dt);
      pull(bottom, target, springs.bottom, dt);
      left -= dt;
    }
    if (settled(top, target) && settled(bottom, target)) {
      jump();
      return;
    }
    draw();
    frame = requestAnimationFrame(tick);
  };

  /** Where the square sits beside a link: after the end of its first text line, centered on it. */
  const place = (link: HTMLAnchorElement) => {
    const range = document.createRange();
    range.selectNodeContents(link);
    const text = range.getClientRects()[0];
    const box = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    const line = Number.parseFloat(style.lineHeight);
    const padding = Number.parseFloat(style.paddingTop);
    return {
      x: link.offsetLeft + (text ? text.right - box.left : link.offsetWidth) + spacing,
      y: link.offsetTop + padding + (line - marker.offsetHeight) / 2,
    };
  };
  for (const { link, heading } of parts)
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: still.matches ? "instant" : "smooth" });
      history.replaceState(history.state, "", link.hash);
    });

  const update = () => {
    queued = false;
    // A part is being read once its heading reaches the reading line, a quarter down the viewport.
    // Parts near the end of a page can never get there, so their starts are pulled back into the
    // scroll range, a step apart, and every part is reached on the way down.
    const line = innerHeight / 4;
    const end = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const step = 64;
    const starts = parts.map(({ heading }) => heading.getBoundingClientRect().top + scrollY - line);
    for (let at = starts.length - 1; at >= 0; at -= 1) {
      const after = starts[at + 1];
      const limit = after === undefined ? end : after - step;
      starts[at] = Math.max(0, Math.min(starts[at] ?? 0, limit));
    }
    let index = 0;
    for (const [at, start] of starts.entries()) if (scrollY >= start) index = at;
    const part = parts[index];
    if (!part || index === current) return;
    const first = current === -1;
    current = index;
    for (const [at, { link }] of parts.entries()) {
      if (at === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    target = place(part.link);
    marker.style.visibility = "visible";
    if (first || still.matches) {
      jump();
      return;
    }
    // The edge facing the new part leads; the other trails.
    springs = target.y < top.y ? { top: lead, bottom: trail } : { top: trail, bottom: lead };
    if (frame !== 0) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener("scroll", schedule, { passive: true });
  const remeasure = () => {
    current = -1;
    schedule();
  };
  addEventListener("resize", remeasure);
  // The web font changes the words' widths once it arrives.
  void document.fonts.ready.then(remeasure);
  update();
}
