export type Point = { x: number; y: number };

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
 * Moves a 4:3 marker square, absolutely placed from its top-left corner, between targets. `move`
 * smears it there; `jump` puts it there at once, at rest. Targets are its top-left corner.
 */
export function smear(marker: HTMLElement): { move(to: Point): void; jump(to: Point): void } {
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

  const jump = (to: Point) => {
    target = to;
    cancelAnimationFrame(frame);
    frame = 0;
    Object.assign(top, to, { vx: 0, vy: 0 });
    Object.assign(bottom, to, { vx: 0, vy: 0 });
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
      jump(target);
      return;
    }
    draw();
    frame = requestAnimationFrame(tick);
  };

  const move = (to: Point) => {
    target = to;
    // The edge facing the new target leads; the other trails.
    springs = to.y < top.y ? { top: lead, bottom: trail } : { top: trail, bottom: lead };
    if (frame !== 0) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  return { move, jump };
}
