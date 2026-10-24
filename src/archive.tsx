import * as stylex from "@stylexjs/stylex";
import { parse, sources } from "./markdown.tsx";
import { type Media, media as artwork } from "./media.ts";
import { type Case, cases } from "./site.ts";
import { colors, media, space, typeScale } from "./tokens.stylex.ts";
import { ui } from "./ui.tsx";
import { versioned } from "./versioned.ts";

/**
 * The artwork's width as a percentage of its square, as CSS: the whole square for a screenshot
 * or recording, which fills and is cropped to it; 60% for a logo mark, a fifth of the square
 * clear on each side, so a mark and a screenshot read at one optical size.
 */
function share(item: Media): string {
  return item.mark ? "60" : "100";
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

/** What `?sort=` on the archive page orders by; archive-only work has no date. */
function sortData(work: Work) {
  switch (work.from.$) {
    case "Case": {
      const { date, title } = work.from.project;
      return { "data-date": date, "data-title": title };
    }
    case "Archive":
      return { "data-date": "", "data-title": "Archive" };
    default: {
      const _: never = work.from;
      return _;
    }
  }
}

// Two tiles a row in the content column, less half the gap between them; phones stop at the
// column's 544px, where the page centres on it (`layout.tsx`).
const tileSizes =
  "(max-width: 767px) min(calc(50vw - 20px), 264px), (max-width: 876px) calc(50vw - 184px), 256px";

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
      {...stylex.props(ui.edge, styles.art)}
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
      {...stylex.props(!item.mark && ui.edge, styles.art, item.mark && styles.mark)}
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
      </div>
      <figcaption {...stylex.props(styles.caption)}>
        {work.from.$ === "Case" ? (
          <a {...stylex.props(ui.quiet, ui.respond, ui.focusRing)} href={href}>
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

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: { default: space.tileGap, [media.mobile]: space.tableGap },
  },
  page: {
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    order: { default: null, [media.mobile]: 5 },
  },
  tile: { minWidth: 0, margin: 0 },
  /**
   * The square. A screenshot or recording fills it edge to edge and is cropped to it, so every
   * tile is the same shape and shows only the work, never the page around it; the enlargement
   * (`zoom.ts`) opens from the crop to the whole piece. A mark has no edges to crop to, so it
   * stands centred at 60% of the square (`share`). The surface corner, `space.radius`.
   */
  cell: {
    display: "grid",
    placeItems: "center",
    aspectRatio: "1",
    borderRadius: space.radius,
    overflow: "hidden",
  },
  frame: { display: "grid", placeItems: "center", width: "100%", height: "100%" },
  zoom: { cursor: { default: "auto", [media.desktop]: "zoom-in" } },
  /** Takes the corner too, so `zoom.ts` opens the enlargement from it. */
  art: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: space.radius,
    userSelect: "none",
    WebkitUserDrag: "none",
  },
  /** Marks (logos): whole, at their own ratio; the page's ink in light mode. */
  mark: { height: "auto", objectFit: "fill", filter: colors.artworkFilter },
  caption: {
    display: "block",
    marginTop: space.unit,
    fontSize: typeScale.labelSize,
    lineHeight: typeScale.labelLeading,
    letterSpacing: typeScale.labelTracking,
  },
  plain: { color: colors.tertiary },
});
