/**
 * The side archive's tiles as data, not markup. Every page carries the whole archive beside it;
 * sent as 52 rendered tiles it was two thirds of each page's HTML, burying the page's own text
 * for readers that take the raw HTML (agents, crawlers). The data is a fraction of the size and
 * `buildSideArchive` turns it back into exactly the markup the server would have sent.
 */
export type SideArchiveData = {
  classes: {
    link: string;
    cell: string;
    frame: string;
    caption: string;
    art: string;
    markArt: string;
  };
  /** Prefix of every image path, left out of `src` and `srcset`. */
  images: string;
  sizes: string;
  tiles: readonly {
    href: string;
    label: string;
    alt: string;
    width: number;
    height: number;
    /** The artwork's width as a percentage of its square, as CSS (`"88.000"`). */
    share: string;
    src: string;
    srcset?: string;
    mark?: true;
    /** A recording: its file; `src` is then the poster. */
    video?: string;
  }[];
};

/**
 * Builds the tiles, in a new random order, into the element just before the running script.
 * Runs inline as the parser reaches it, so the first paint already has them in place.
 * Self-contained on purpose: `SideArchive` inlines its source.
 */
export function buildSideArchive(data: SideArchiveData): void {
  const grid = document.currentScript?.previousElementSibling;
  if (!grid) return;
  const { classes, images } = data;
  const element = (tag: string, attributes: readonly [string, string][]) => {
    const node = grid.ownerDocument.createElement(tag);
    for (const [name, value] of attributes) node.setAttribute(name, value);
    return node;
  };
  // Random keys, then sorted: every order equally likely.
  const order = data.tiles
    .map((tile) => ({ tile, key: Math.random() }))
    .toSorted((left, right) => left.key - right.key);
  for (const { tile } of order) {
    const size: [string, string] = ["style", `width:${tile.share}%;`];
    const art = tile.video
      ? element("video", [
          ["class", classes.art],
          ["width", String(tile.width)],
          ["height", String(tile.height)],
          ["poster", images + tile.src],
          ["src", tile.video],
          ["muted", ""],
          ["loop", ""],
          ["playsinline", ""],
          ["preload", "none"],
          ["aria-label", tile.alt],
          ["data-autoplay", ""],
        ])
      : element("img", [
          ["class", tile.mark ? classes.markArt : classes.art],
          ["alt", tile.alt],
          ["width", String(tile.width)],
          ["height", String(tile.height)],
          ["decoding", "async"],
          ["loading", "lazy"],
          ["src", images + tile.src],
          ...(tile.srcset === undefined
            ? []
            : ([
                [
                  "srcset",
                  tile.srcset
                    .split(", ")
                    .map((source) => images + source)
                    .join(", "),
                ],
                ["sizes", data.sizes],
              ] satisfies [string, string][])),
        ]);
    // A muted attribute does not mute a scripted video; autoplay needs the property too.
    if (art instanceof HTMLVideoElement) art.muted = true;
    const frame = element("div", [["class", classes.frame], size]);
    frame.append(art);
    const cell = element("div", [["class", classes.cell]]);
    cell.append(frame);
    const caption = element("span", [["class", classes.caption]]);
    caption.textContent = tile.label;
    const link = element("a", [
      ["class", classes.link],
      ["href", tile.href],
      ["aria-label", `${tile.label}: ${tile.alt}`],
    ]);
    link.append(cell, caption);
    grid.append(link);
  }
}
