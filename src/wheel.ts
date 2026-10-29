/**
 * The wheel: a page's entries ride a drum down the content column, and the page's own scroll
 * turns the drum. One entry faces the reader at a time while its neighbours tilt away above and
 * below it, and the frosted pill (`layout.tsx`) stands between them as the drum's axle.
 *
 * CSS (`layout.tsx`) lays every `[data-wheel]` out as the plain page flow by default; this
 * script, on a desktop viewport with motion allowed, measures each drum (the radius from a
 * face's half height and the step from face to face), marks it `data-wheel-ready`, and from
 * then on maps the page's scroll through a drum's track to one rotation angle. The page never
 * stops scrolling: the scrollbar, the keys and touch stay the browser's own, and without the
 * mark (a phone, reduced motion, no JavaScript) the page is its ordinary self.
 *
 * Self-contained on purpose: `wheelScript` inlines its source at the end of `<body>`.
 */
export function wheel(): void {
  const allow = matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
  /** Degrees from one face to the next around the drum. */
  const STEP = 30;
  /** A face's height as a share of the viewport: the slat the drum is built from. */
  const SLOT = 0.5;

  type Drum = {
    track: HTMLElement;
    world: HTMLElement;
    faces: HTMLElement[];
    /** Scroll pixels from one face's place to the next. */
    arc: number;
  };
  let drums: Drum[] = [];

  /** Angles each face by its place in the drum, in whatever order the children stand now. */
  function angle(drum: Drum): void {
    drum.faces = [...drum.world.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    drum.faces.forEach((face, index) =>
      face.style.setProperty("--wheel-face-angle", `${(-index * STEP).toFixed(2)}deg`),
    );
  }

  function setup(): void {
    for (const drum of drums) {
      drum.track.style.height = "";
      drum.track.removeAttribute("data-wheel-ready");
    }
    drums = [];
    if (allow.matches) {
      const slot = Math.min(window.innerHeight * SLOT, 480);
      const step = (STEP * Math.PI) / 180;
      const radius = Math.round(slot / 2 / Math.tan(step / 2));
      const arc = radius * step;
      for (const track of document.querySelectorAll<HTMLElement>("[data-wheel]")) {
        const world = track.querySelector<HTMLElement>("[data-wheel-world]");
        if (!world) continue;
        const drum: Drum = { track, world, faces: [], arc };
        angle(drum);
        // A page of one block has nothing to turn; it keeps the plain flow.
        if (drum.faces.length < 2) continue;
        track.style.setProperty("--wheel-radius", `${radius}px`);
        track.style.setProperty("--wheel-perspective", `${radius * 5}px`);
        track.style.height = `calc(100dvh + ${Math.round((drum.faces.length - 1) * arc)}px)`;
        track.setAttribute("data-wheel-ready", "");
        // Faces can be reordered by the client (the table's sort): re-angle by the new order.
        new MutationObserver(() => angle(drum)).observe(world, { childList: true });
        drums.push(drum);
      }
    }
    update();
  }

  /** Turns each drum to the place its track holds in the page's scroll. */
  function update(): void {
    for (const drum of drums) {
      const box = drum.track.getBoundingClientRect();
      const travel = box.height - window.innerHeight;
      const progress = travel > 1 ? Math.min(1, Math.max(0, -box.top / travel)) : 0;
      drum.world.style.setProperty(
        "--wheel-angle",
        `${(progress * (drum.faces.length - 1) * STEP).toFixed(3)}deg`,
      );
    }
  }

  /** The scroll position that puts the face at `index` in front of the reader. */
  function faceAt(index: number, drum: Drum): number {
    return scrollY + drum.track.getBoundingClientRect().top + index * drum.arc;
  }

  let queued = false;
  function queue(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", setup);
  addEventListener("pageshow", setup);
  allow.addEventListener("change", setup);

  // A part list's link, or any link into the drum: the browser cannot jump to a face (they all
  // project near the centre), so the scroll goes to the face's place on the track instead.
  document.addEventListener("click", (event) => {
    if (!allow.matches || event.button !== 0 || event.metaKey || event.ctrlKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const target = document.getElementById(decodeURIComponent(anchor.hash.slice(1)));
    const world = target?.closest("[data-wheel-world]");
    if (!target || !(world instanceof HTMLElement)) return;
    const drum = drums.find((each) => each.world === world);
    if (!drum) return;
    const face = target.closest("[data-wheel-face]");
    if (!face) return;
    event.preventDefault();
    scrollTo({ top: faceAt([...world.children].indexOf(face), drum) });
  });

  // Keyboard focus brings its face around too: tabbing into the drum, or stepping through the
  // table with the arrow keys, turns to the entry that took the focus.
  document.addEventListener("focusin", (event) => {
    if (!allow.matches) return;
    const face = event.target instanceof Element ? event.target.closest("[data-wheel-face]") : null;
    const world = face?.closest("[data-wheel-world]");
    if (!face || !(world instanceof HTMLElement)) return;
    const drum = drums.find((each) => each.world === world);
    if (!drum) return;
    const top = faceAt([...world.children].indexOf(face), drum);
    if (Math.abs(top - scrollY) > 2) scrollTo({ top });
  });

  setup();
}
