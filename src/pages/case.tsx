import * as stylex from "@stylexjs/stylex";
import { ArchiveGrid, SideArchive, type Work } from "../archive.tsx";
import { Island } from "../island.tsx";
import { Converter } from "../islands/archetypon.tsx";
import { Article, styles as article, parse, singleSizes, sources } from "../markdown.tsx";
import { ui } from "../ui.tsx";
import {
  type Assets,
  Document,
  JsonLd,
  Main,
  Name,
  PageLinks,
  Shell,
  Sidebar,
} from "../layout.tsx";
import { Row } from "../row.tsx";
import {
  type Case,
  origin,
  pages,
  person,
  type Product,
  products,
  type Project,
  projects,
} from "../site.ts";
import { media, space } from "../tokens.stylex.ts";
import { versioned } from "../versioned.ts";

const monoBlocks = (markdown: string) =>
  parse(markdown).blocks.some(
    (block) =>
      block.type === "code" ||
      (block.type === "media" && block.items.some(({ id }) => id === "heph-demo")),
  );

/**
 * Every inner page. Its tab and its link preview read like its breadcrumb ("Gil Rodrigues → T3")
 * unless the page names its own `title`; the preview shows the page's own image, or else the
 * homepage as rendered at build time.
 */
function Frame({
  assets,
  url,
  current,
  title = `${person.name} → ${current}`,
  type,
  description,
  shareDescription = description,
  image = assets.shareImage,
  table,
  head,
  mono,
  third,
  children,
}: {
  assets: Assets;
  /** The canonical URL. */
  url: string;
  title?: string;
  type: "article" | "website";
  description: string;
  shareDescription?: string;
  /** A stamped site path, see `versioned`. */
  image?: string;
  current: string;
  /** The project list the page shows, if any; the phone links align to its columns. */
  table?: readonly Project[];
  head: preact.ComponentChildren;
  mono: boolean;
  /**
   * Wide screens' third column: the archive beside the text, the page's own content spanning it
   * (the archive page), or nothing, so an article reads alone (product pages).
   */
  third: { $: "Archive"; work: readonly Work[] } | { $: "Content" } | { $: "Empty" };
  children: preact.ComponentChildren;
}) {
  return (
    <Document
      assets={assets}
      title={title}
      mono={mono}
      head={
        <>
          <meta name="description" content={description} />
          <meta name="author" content={person.name} />
          <meta name="creator" content={person.name} />
          <meta name="robots" content="index, follow, max-image-preview:large" />
          <link rel="canonical" href={url} />
          <meta property="og:type" content={type} />
          <meta property="og:url" content={url} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={shareDescription} />
          <meta property="og:image" content={`${origin}${image}`} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={shareDescription} />
          <meta name="twitter:image" content={`${origin}${image}`} />
          {head}
        </>
      }
    >
      <Shell>
        <Sidebar
          label={{
            "aria-label": `${current} navigation`,
          }}
        >
          <Name current={current} />
          <PageLinks phone={false} />
        </Sidebar>
        <Main wide={third.$ === "Content"}>{children}</Main>
        {third.$ === "Archive" && <SideArchive work={third.work} home={false} />}
        <PageLinks phone {...(table && { table })} />
      </Shell>
    </Document>
  );
}

/** Starts loading a page's first image with the HTML, since it is usually the largest paint. */
function HeroPreload({ markdown }: { markdown: string }) {
  const first = parse(markdown).blocks.find((block) => block.type === "media")?.items[0]?.id;
  if (!first || first === "heph-demo") return null;
  const { src, srcset } = sources(first);
  return (
    <link
      rel="preload"
      as="image"
      href={src}
      {...(srcset && { imagesrcset: srcset, imagesizes: singleSizes })}
      fetchPriority="high"
    />
  );
}

function Alternates({ slug, name }: { slug?: string; name?: string }) {
  return (
    <>
      <link
        rel="alternate"
        type="text/markdown"
        href={`${origin}/llms.txt`}
        title={`LLM reference for ${person.name}`}
      />
      <link
        rel="alternate"
        type="text/markdown"
        href={`${origin}/llms-full.txt`}
        title={`Full public website text for ${person.name}`}
      />
      {slug && (
        <link
          rel="alternate"
          type="text/markdown"
          href={`${origin}/content/${slug}.md`}
          title={`Markdown source for ${name}`}
        />
      )}
    </>
  );
}

export function CasePage({
  assets,
  item,
  markdown,
  work,
}: {
  assets: Assets;
  item: Case;
  markdown: string;
  work: readonly Work[];
}) {
  const url = `${origin}/${item.slug}`;
  const image = item.ogImage && versioned(`/images/optimized/${item.ogImage}`);
  const others = next(`/${item.slug}`);
  return (
    <Frame
      assets={assets}
      url={url}
      type="article"
      description={item.description}
      shareDescription={item.ogDescription}
      {...(image && { image })}
      current={item.name}
      table={others}
      mono={monoBlocks(markdown)}
      third={{ $: "Archive", work }}
      head={
        <>
          <Alternates slug={item.slug} name={item.name} />
          <JsonLd
            value={{
              "@context": "https://schema.org",
              "@type": "Article",
              "@id": `${url}#case-study`,
              url,
              headline: parse(markdown).title,
              description: item.description,
              ...(image && { image }),
              author: {
                "@type": "Person",
                "@id": `${origin}/#person`,
                name: person.name,
                url: `${origin}/`,
              },
              inLanguage: "en",
            }}
          />
          <HeroPreload markdown={markdown} />
        </>
      }
    >
      <article {...stylex.props(styles.column, styles.phoneItem)}>
        <Article markdown={markdown} eager variant={{ $: "Index" }} />
      </article>
      <Next projects={others} />
    </Frame>
  );
}

/**
 * The three projects after this one in the homepage's order, wrapping round to the newest;
 * external projects are left out unless they are products, whose pages live on their own hosts.
 */
function next(href: string): Project[] {
  const own = projects.filter(
    (project) => !project.external || products.some(({ home }) => `${home}/` === project.href),
  );
  const at = own.findIndex((project) => project.href === href);
  return [1, 2, 3]
    .map((step) => own[(at + step) % own.length])
    .filter((project): project is Project => project !== undefined && project.href !== href);
}

function Next({ projects: list }: { projects: readonly Project[] }) {
  return (
    <nav {...stylex.props(styles.column, styles.phoneItem, styles.next)} aria-label="More projects">
      <div {...stylex.props(styles.nextList)}>
        {list.map((project, index) => (
          <Row key={project.href} project={project} first={index === 0} home={false} />
        ))}
      </div>
    </nav>
  );
}

/** The archive: the artwork of every case study as one grid of images, newest first. */
export function AllPage({ assets, work }: { assets: Assets; work: readonly Work[] }) {
  return (
    <Frame
      assets={assets}
      url={`${origin}/all`}
      type="website"
      description={`Logos, typefaces, identities and websites by ${person.name}.`}
      current="Archive"
      mono={false}
      third={{ $: "Content" }}
      head={<Alternates />}
    >
      <ArchiveGrid work={work} />
    </Frame>
  );
}

const styles = stylex.create({
  column: { width: `min(100%, ${space.contentColumn})`, marginInline: "auto" },
  phoneItem: {
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    order: { default: null, [media.mobile]: 5 },
  },
  next: {
    marginTop: { default: "48px", "@media (min-width: 769px)": "auto" },
    paddingTop: { default: null, "@media (min-width: 769px)": "48px" },
    paddingBottom: {
      default: null,
      "@media (min-width: 769px)": `calc(${space.toggleSize} / 2 - 12px)`,
    },
  },
  nextList: {
    display: "grid",
    gridTemplateColumns: space.tableColumns,
    columnGap: { default: space.tableGap, "@media (max-width: 768px)": space.mobileTableGap },
  },
});

/** A plain page (about, contact, …) written in Markdown. */
export function DocPage({
  assets,
  page,
  markdown,
  work,
}: {
  assets: Assets;
  page: (typeof pages)[number];
  markdown: string;
  work: readonly Work[];
}) {
  return (
    <Frame
      assets={assets}
      url={`${origin}/${page.slug}`}
      type="website"
      description={page.description}
      current={page.name}
      mono={monoBlocks(markdown)}
      third={{ $: "Archive", work }}
      head={
        <>
          <Alternates slug={page.slug} name={page.name} />
        </>
      }
    >
      <article {...stylex.props(styles.column, styles.phoneItem)}>
        <Article markdown={markdown} eager variant={{ $: "Index" }} />
      </article>
    </Frame>
  );
}

/**
 * A product, served on its own host (see `worker/products.ts`): an article on what it solves,
 * with Archetypon's converter right after the opening.
 */
export function ProductPage({
  assets,
  item,
  markdown,
}: {
  assets: Assets;
  item: Product;
  markdown: string;
}) {
  const url = `${item.home}/`;
  const others = next(url);
  return (
    <Frame
      assets={assets}
      url={url}
      title={item.headline}
      type="website"
      description={item.description}
      current={item.name}
      table={others}
      mono={monoBlocks(markdown)}
      third={{ $: "Empty" }}
      head={
        <>
          <Alternates slug={item.slug} name={item.name} />
          <JsonLd
            value={{
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "@id": `${url}#software`,
              url,
              name: item.name,
              description: item.description,
              applicationCategory: item.category,
              operatingSystem: item.operatingSystem,
              ...(item.converter && { browserRequirements: "Requires WebAssembly" }),
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              isAccessibleForFree: true,
              codeRepository: item.repository,
              author: {
                "@type": "Person",
                "@id": `${origin}/#person`,
                name: person.name,
                url: `${origin}/`,
              },
              inLanguage: "en",
            }}
          />
        </>
      }
    >
      <article {...stylex.props(styles.column, styles.phoneItem)}>
        <Article
          markdown={markdown}
          eager
          variant={{
            $: "Post",
            byline: (
              <>
                <a {...stylex.props(article.link, ui.focusRing)} href={`${origin}/`}>
                  {person.name}
                </a>
                {" · "}
                <time dateTime={item.date}>
                  {new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </time>
                {" · "}
                <a
                  {...stylex.props(article.link, ui.focusRing)}
                  href={item.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source on GitHub
                </a>
              </>
            ),
            tool: item.converter ? (
              <Island name="archetypon" component={Converter} props={{}} />
            ) : null,
          }}
        />
      </article>
      <Next projects={others} />
    </Frame>
  );
}
