import * as stylex from "@stylexjs/stylex";
import { parse, sources } from "./markdown.tsx";
import { media as artwork } from "./media.ts";
import { type Case, cases } from "./site.ts";
import { colors, media, space } from "./tokens.stylex.ts";
import { ui } from "./ui.tsx";
import { versioned } from "./versioned.ts";

/** One piece of artwork and the case study it comes from. */
export type Work = { id: string; project: Case };

/**
 * The archive: every `archive` media item, newest case first and in its page's order. Each
 * flagged item must appear on a case page, since its tile names and links that case.
 */
export function collect(markdown: Readonly<Record<string, string>>): Work[] {
  const work = cases.flatMap((project) => {
    const body = markdown[project.slug];
    if (body === undefined) throw new Error(`Missing src/content/${project.slug}.md`);
    const ids = parse(body).blocks.flatMap((block) =>
      block.type === "media" ? block.items.map(({ id }) => id) : [],
    );
    return ids
      .filter((id, index) => artwork[id]?.archive === true && ids.indexOf(id) === index)
      .map((id) => ({ id, project }));
  });
  const shown = new Set(work.map(({ id }) => id));
  for (const [id, item] of Object.entries(artwork)) {
    if (item.archive === true && !shown.has(id)) {
      throw new Error(`Archive media ${id} is on no case page`);
    }
  }
  return work;
}

const tileSizes = "(max-width: 767px) calc(50vw - 20px), 320px";

/**
 * A square cell with the artwork contained in it at its own ratio. Beside a page (`link`) the
 * tile opens its case study; in the archive the image enlarges (`zoom.ts`) and the caption links.
 */
function Tile({ work, link, eager }: { work: Work; link: boolean; eager: boolean }) {
  const item = artwork[work.id];
  if (item === undefined) throw new Error(`Unknown media id: ${work.id}`);
  const { project } = work;
  const href = `/${project.slug}`;
  // The artwork's width as a share of the square's: full for landscape, less for portrait.
  const share = Math.min(item.width / item.height, 1) * (item.mark ? 0.88 : 1);
  const size = { width: `${(share * 100).toFixed(3)}%` };
  const { src, srcset } = sources(work.id);
  const art = item.video ? (
    <video
      {...stylex.props(styles.art)}
      // Bare in the archive, so it takes the square's share itself; else its link does.
      {...(!link && { style: size })}
      width={item.width}
      height={item.height}
      poster={src}
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
      {...(eager ? { fetchpriority: "high" } : { loading: "lazy" })}
      src={src}
      {...(srcset && { srcset, sizes: tileSizes })}
    />
  );
  return (
    <figure
      {...stylex.props(styles.tile)}
      data-date={project.date}
      data-title={project.title}
      data-scope={project.scope}
    >
      <div {...stylex.props(styles.cell)}>
        {link ? (
          <a
            {...stylex.props(ui.focusRing, styles.frame)}
            style={size}
            href={href}
            aria-label={`${project.name}: ${item.alt}`}
          >
            {art}
          </a>
        ) : item.video ? (
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
      {!link && (
        <figcaption {...stylex.props(styles.caption)}>
          <a {...stylex.props(ui.quiet, ui.focusRing)} href={href}>
            {project.name}
          </a>
        </figcaption>
      )}
    </figure>
  );
}

/** The archive page's grid; `?sort=` from the homepage table reorders it (see `client.ts`). */
export function ArchiveGrid({ work }: { work: readonly Work[] }) {
  return (
    <div {...stylex.props(styles.grid, styles.page)} data-all-cases>
      {work.map((item, index) => (
        <Tile work={item} link={false} eager={index === 0} />
      ))}
    </div>
  );
}

/**
 * The third column on wide screens: the archive beside the homepage table or a page's text.
 * It scrolls on its own, so the homepage still holds to the viewport and an inner page keeps it
 * in view while the text scrolls. A case study leaves its own artwork out: it is in the text.
 */
export function SideArchive({ work, home }: { work: readonly Work[]; home: boolean }) {
  return (
    <section
      {...stylex.props(styles.side, home ? styles.home : styles.inner)}
      aria-label="Archive"
      data-nosnippet
    >
      <div {...stylex.props(styles.grid)}>
        {work.map((item) => (
          <Tile work={item} link eager={false} />
        ))}
      </div>
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
  cell: { display: "grid", placeItems: "center", aspectRatio: "1" },
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
  caption: { marginTop: "8px", fontSize: "14px", lineHeight: "20px" },
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
