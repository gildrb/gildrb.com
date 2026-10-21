import * as stylex from "@stylexjs/stylex";
import { scriptJson } from "./layout.tsx";
import { parse, sources } from "./markdown.tsx";
import { type Media, media as artwork } from "./media.ts";
import { buildSideArchive, type SideArchiveData } from "./side-archive.ts";
import { type Case, cases } from "./site.ts";
import { colors, media, space, tileMarker } from "./tokens.stylex.ts";
import { ui } from "./ui.tsx";
import { versioned } from "./versioned.ts";

/**
 * The artwork's width as a percentage of its square, as CSS: full for landscape, less for
 * portrait; logo marks keep their inset.
 */
function share(item: Media): string {
  return (Math.min(item.width / item.height, 1) * (item.mark ? 88 : 100)).toFixed(3);
}

/**
 * One piece of artwork and where it comes from: a case study, or the archive alone for work
 * that has no project page.
 */
export type Work = { id: string; from: { $: "Case"; project: Case } | { $: "Archive" } };

/**
 * The archive: every `archive` media item, newest case first, each case's in its page's order and
 * then those tagged with its `project`; last the items that belong to no case, in `media.ts`
 * order.
 */
export function collect(markdown: Readonly<Record<string, string>>): Work[] {
  for (const [id, item] of Object.entries(artwork)) {
    if (item.home === true && item.archive !== true) {
      throw new Error(`Homepage media ${id} is not in the archive`);
    }
  }
  const entries = Object.entries(artwork).filter(([, item]) => item.archive === true);
  for (const [id, { project }] of entries) {
    if (project !== undefined && !cases.some(({ slug }) => slug === project)) {
      throw new Error(`Archive media ${id} names an unknown project: ${project}`);
    }
  }
  const work: Work[] = cases.flatMap((project) => {
    const body = markdown[project.slug];
    if (body === undefined) throw new Error(`Missing src/content/${project.slug}.md`);
    const ids = parse(body).blocks.flatMap((block) =>
      block.type === "media" ? block.items.map(({ id }) => id) : [],
    );
    const tagged = entries.filter(([, item]) => item.project === project.slug).map(([id]) => id);
    return [...ids, ...tagged]
      .filter((id, index, all) => artwork[id]?.archive === true && all.indexOf(id) === index)
      .map((id) => ({ id, from: { $: "Case", project } }));
  });
  const shown = new Set(work.map(({ id }) => id));
  const alone: Work[] = entries
    .filter(([id]) => !shown.has(id))
    .map(([id]) => ({ id, from: { $: "Archive" } }));
  return [...work, ...alone];
}

/**
 * The tile's label and where it leads: the case study, or the archive page opened on this very
 * work (first in the grid and enlarged, see `client.ts`).
 */
function destination(work: Work): { label: string; href: string } {
  switch (work.from.$) {
    case "Case":
      return { label: work.from.project.name, href: `/${work.from.project.slug}` };
    case "Archive":
      return { label: "Archive", href: `/all?open=${work.id}` };
    default: {
      const _: never = work.from;
      return _;
    }
  }
}

/** What `?sort=` on the archive page orders by; archive-only work has no date or scope. */
function sortData(work: Work) {
  switch (work.from.$) {
    case "Case": {
      const { date, title, scope } = work.from.project;
      return { "data-date": date, "data-title": title, "data-scope": scope };
    }
    case "Archive":
      return { "data-date": "", "data-title": "Archive", "data-scope": "" };
    default: {
      const _: never = work.from;
      return _;
    }
  }
}

const tileSizes = "(max-width: 767px) calc(50vw - 20px), 320px";

/**
 * How a tile's image loads: the archive's first image is its largest paint, so it comes first;
 * the rest of the first row loads with the page; everything below waits until it is near.
 */
type Load = "first" | "eager" | "lazy";

/** A square cell with the artwork contained in it at its own ratio; it enlarges (`zoom.ts`). */
function Tile({ work, load }: { work: Work; load: Load }) {
  const item = artwork[work.id];
  if (item === undefined) throw new Error(`Unknown media id: ${work.id}`);
  const { label, href } = destination(work);
  const size = { width: `${share(item)}%` };
  const { src, srcset } = sources(work.id);
  // A poster has no srcset; a tile is never wider than the smallest variant.
  const poster = srcset?.split(" ")[0] ?? src;
  const art = item.video ? (
    <video
      {...stylex.props(styles.art)}
      // Bare, so it takes the square's share itself.
      style={size}
      width={item.width}
      height={item.height}
      poster={poster}
      src={versioned(`/videos/gil-rodrigues-${work.id}.mp4`)}
      muted
      loop
      playsInline
      preload="none"
      aria-label={item.alt}
      data-autoplay
    />
  ) : (
    <img
      {...stylex.props(styles.art, item.mark && styles.mark)}
      alt={item.alt}
      width={item.width}
      height={item.height}
      decoding="async"
      {...(load === "first" && { fetchPriority: "high" })}
      {...(load === "lazy" && { loading: "lazy" })}
      src={src}
      {...(srcset && { srcset, sizes: tileSizes })}
    />
  );
  return (
    <figure {...stylex.props(styles.tile)} {...sortData(work)} data-work={work.id}>
      <div {...stylex.props(styles.cell)}>
        {item.video ? (
          art
        ) : (
          <button
            type="button"
            {...stylex.props(ui.reset, ui.focusRing, styles.frame, styles.zoom)}
            style={size}
            aria-label={`Enlarge: ${item.alt}`}
            aria-expanded="false"
            data-zoom
          >
            {art}
          </button>
        )}
      </div>
      <figcaption {...stylex.props(styles.caption)}>
        {work.from.$ === "Case" ? (
          <a {...stylex.props(ui.quiet, ui.focusRing)} href={href}>
            {label}
          </a>
        ) : (
          <span {...stylex.props(styles.plain)}>{label}</span>
        )}
      </figcaption>
    </figure>
  );
}

/** The archive page's grid; `?sort=` from the homepage table reorders it (see `client.ts`). */
export function ArchiveGrid({ work }: { work: readonly Work[] }) {
  return (
    <div {...stylex.props(styles.grid, styles.page)} data-all-cases>
      {work.map((item, index) => (
        <Tile
          key={item.id}
          work={item}
          load={
            index === work.findIndex(({ id }) => artwork[id]?.video !== true)
              ? "first"
              : index < 5
                ? "eager"
                : "lazy"
          }
        />
      ))}
    </div>
  );
}

const imagePrefix = "/images/optimized/gil-rodrigues-";

/** The tiles beside a page, as data for `buildSideArchive`. */
function sideData(work: readonly Work[]): SideArchiveData {
  const strip = (path: string) => {
    if (!path.startsWith(imagePrefix)) throw new Error(`Image outside ${imagePrefix}: ${path}`);
    return path.slice(imagePrefix.length);
  };
  return {
    classes: {
      link: stylex.props(ui.focusRing, styles.tile, styles.linkTile, tileMarker).className ?? "",
      cell: stylex.props(styles.cell).className ?? "",
      frame: stylex.props(styles.frame).className ?? "",
      caption: stylex.props(styles.caption, styles.linkCaption).className ?? "",
      art: stylex.props(styles.art).className ?? "",
      markArt: stylex.props(styles.art, styles.mark).className ?? "",
    },
    images: imagePrefix,
    sizes: tileSizes,
    tiles: work.map((piece) => {
      const item = artwork[piece.id];
      if (item === undefined) throw new Error(`Unknown media id: ${piece.id}`);
      const { label, href } = destination(piece);
      const { src, srcset } = sources(piece.id);
      const variants = srcset?.split(", ").map(strip);
      return {
        href,
        label,
        alt: item.alt,
        width: item.width,
        height: item.height,
        share: share(item),
        ...(item.video
          ? // A poster has no srcset; a tile is never wider than the smallest variant.
            {
              src: variants?.[0]?.split(" ")[0] ?? strip(src),
              video: versioned(`/videos/gil-rodrigues-${piece.id}.mp4`),
            }
          : { src: strip(src), ...(variants && { srcset: variants.join(", ") }) }),
        ...(item.mark && { mark: true }),
      };
    }),
  };
}

/**
 * The third column on wide screens: the curated `home` picks, newest project first, beside the
 * homepage table or a plain page without parts. It scrolls on its own, so the homepage still holds
 * to the viewport and an inner page keeps it in view while the text scrolls. Its tiles are built
 * from data as the page parses (`side-archive.ts`); without JavaScript the column stays empty and
 * the archive page has them all.
 */
export function SideArchive({ work, home }: { work: readonly Work[]; home: boolean }) {
  const script = `(${buildSideArchive.toString()})(${scriptJson(sideData(work))})`;
  return (
    <section
      {...stylex.props(styles.side, home ? styles.home : styles.inner)}
      aria-label="Archive"
      data-nosnippet
      data-side-archive
    >
      <div {...stylex.props(styles.grid)} />
      <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: script }} />
    </section>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: `repeat(auto-fill, minmax(${space.tileMin}, 1fr))`,
      [media.mobile]: "repeat(2, minmax(0, 1fr))",
    },
    gap: { default: space.tileGap, [media.mobile]: "16px" },
  },
  page: {
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    order: { default: null, [media.mobile]: 5 },
  },
  side: {
    display: { default: "none", [media.wide]: "block" },
    gridColumn: 3,
    overflowY: "auto",
    // Reaching its end must not scroll the page beside it (see also `wheel.ts`).
    overscrollBehavior: "contain",
    scrollbarWidth: "none",
  },
  home: {
    gridRow: "1 / 4",
    // Adds no height of its own: the column is as tall as the table beside it, and scrolls.
    contain: "size",
    // Scrolls out to the viewport's edges, past the page inset.
    marginBlock: `calc(${space.pageInset} * -1)`,
    paddingBlock: space.pageInset,
  },
  tile: { minWidth: 0, margin: 0 },
  /** Art stands on the cell's bottom-left corner, so every caption sits right under its image. */
  cell: { display: "grid", placeItems: "end start", aspectRatio: "1" },
  frame: { display: "block" },
  zoom: { cursor: { default: "auto", [media.desktop]: "zoom-in" } },
  art: {
    display: "block",
    width: "100%",
    height: "auto",
    userSelect: "none",
    WebkitUserDrag: "none",
  },
  mark: { filter: colors.artworkFilter },
  caption: { display: "block", marginTop: "8px", fontSize: "14px", lineHeight: "20px" },
  linkTile: { display: "block", textDecoration: "none" },
  /** Raised to full contrast while its tile is hovered, like a quiet link. */
  linkCaption: {
    color: {
      default: colors.tertiary,
      [stylex.when.ancestor(":hover", tileMarker)]: { [media.hover]: colors.primary },
      [stylex.when.ancestor(":focus-visible", tileMarker)]: colors.primary,
    },
  },
  plain: { color: colors.tertiary },
  /** Inner pages: held in view, the viewport's height, while the page scrolls beside it. */
  inner: {
    gridRow: 1,
    alignSelf: "start",
    position: "sticky",
    top: 0,
    height: "100vh",
    paddingBlock: space.pageInset,
  },
});
