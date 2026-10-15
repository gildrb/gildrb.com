import * as stylex from "@stylexjs/stylex";
import { parse, sources } from "./markdown.tsx";
import { media as artwork } from "./media.ts";
import { type Case, cases } from "./site.ts";
import { colors, media, space, tileMarker } from "./tokens.stylex.ts";
import { ui } from "./ui.tsx";
import { versioned } from "./versioned.ts";

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

/** The tile's label and where it leads: the case study, or the archive itself. */
function destination(work: Work): { label: string; href: string } {
  switch (work.from.$) {
    case "Case":
      return { label: work.from.project.name, href: `/${work.from.project.slug}` };
    case "Archive":
      return { label: "Archive", href: "/all" };
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
 * A square cell with the artwork contained in it at its own ratio, and a label beneath naming
 * its project. Beside a page (`link`) the whole tile opens the project; in the archive the image
 * enlarges (`zoom.ts`) and the label links.
 */
function Tile({ work, link, eager }: { work: Work; link: boolean; eager: boolean }) {
  const item = artwork[work.id];
  if (item === undefined) throw new Error(`Unknown media id: ${work.id}`);
  const { label, href } = destination(work);
  // The artwork's width as a share of the square's: full for landscape, less for portrait.
  const share = Math.min(item.width / item.height, 1) * (item.mark ? 0.88 : 1);
  const size = { width: `${(share * 100).toFixed(3)}%` };
  const { src, srcset } = sources(work.id);
  const art = item.video ? (
    <video
      {...stylex.props(styles.art)}
      // Bare in the archive, so it takes the square's share itself; else its frame does.
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
  if (link) {
    return (
      <a
        {...stylex.props(ui.focusRing, styles.tile, styles.linkTile, tileMarker)}
        href={href}
        aria-label={`${label}: ${item.alt}`}
      >
        <div {...stylex.props(styles.cell)}>
          <div {...stylex.props(styles.frame)} style={size}>
            {art}
          </div>
        </div>
        <span {...stylex.props(styles.caption, styles.linkCaption)}>{label}</span>
      </a>
    );
  }
  return (
    <figure {...stylex.props(styles.tile)} {...sortData(work)}>
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
        <Tile key={item.id} work={item} link={false} eager={index === 0} />
      ))}
    </div>
  );
}

/**
 * Shuffles the tiles before them, as the parser reaches it, so a fresh order paints first.
 * Fisher–Yates over the element's children; inline, since a module would run after paint.
 */
const shuffleScript =
  "{const g=document.currentScript.previousElementSibling,t=[...g.children];for(let i=t.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[t[i],t[j]]=[t[j],t[i]]}g.append(...t)}";

/**
 * The third column on wide screens: the archive beside the homepage table or a page's text, in
 * a new random order on every visit. It scrolls on its own, so the homepage still holds to the
 * viewport and an inner page keeps it in view while the text scrolls.
 */
export function SideArchive({ work, home }: { work: readonly Work[]; home: boolean }) {
  return (
    <section
      {...stylex.props(styles.side, home ? styles.home : styles.inner)}
      aria-label="Archive"
      data-nosnippet
      data-side-archive
    >
      <div {...stylex.props(styles.grid)}>
        {work.map((item) => (
          <Tile key={item.id} work={item} link eager={false} />
        ))}
      </div>
      <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: shuffleScript }} />
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
