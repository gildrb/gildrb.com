import * as stylex from "@stylexjs/stylex";
import { Island } from "../island.tsx";
import { Converter } from "../islands/archetypon.tsx";
import { Article, parse, singleSizes, sources } from "../markdown.tsx";
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
  cases,
  origin,
  pages,
  person,
  type Project,
  projects,
  type Tool,
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
 * Every inner page. Its tab and its link preview read like its breadcrumb ("Gil Rodrigues → T3");
 * the preview shows the page's own image, or else the homepage as rendered at build time.
 */
function Frame({
  assets,
  path,
  type,
  description,
  shareDescription = description,
  image = assets.shareImage,
  current,
  table,
  head,
  mono,
  children,
}: {
  assets: Assets;
  path: `/${string}`;
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
  children: preact.ComponentChildren;
}) {
  const url = `${origin}${path}`;
  const title = `${person.name} → ${current}`;
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
        <Main>{children}</Main>
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
      fetchpriority="high"
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
}: {
  assets: Assets;
  item: Case;
  markdown: string;
}) {
  const url = `${origin}/${item.slug}`;
  const image = item.ogImage && versioned(`/images/optimized/${item.ogImage}`);
  const others = next(`/${item.slug}`);
  return (
    <Frame
      assets={assets}
      path={`/${item.slug}`}
      type="article"
      description={item.description}
      shareDescription={item.ogDescription}
      {...(image && { image })}
      current={item.name}
      table={others}
      mono={monoBlocks(markdown)}
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
        <Article markdown={markdown} eager showTitle={false} />
      </article>
      <Next projects={others} />
    </Frame>
  );
}

/**
 * The three projects after this one in the homepage's order, wrapping round to the newest;
 * external projects are left out, since they have no page here.
 */
function next(href: string): Project[] {
  const own = projects.filter((project) => !project.external);
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
          <Row project={project} first={index === 0} home={false} />
        ))}
      </div>
    </nav>
  );
}

/** Every case study on one page, newest first; `?sort=` from the homepage table reorders them. */
export function AllPage({
  assets,
  markdown,
}: {
  assets: Assets;
  markdown: Readonly<Record<string, string>>;
}) {
  const description = `All case studies by ${person.name}.`;
  return (
    <Frame
      assets={assets}
      path="/all"
      type="website"
      description={description}
      current="All"
      mono
      head={
        <>
          <Alternates />
          <HeroPreload markdown={markdown[cases[0]?.slug ?? ""] ?? ""} />
        </>
      }
    >
      <div {...stylex.props(styles.phoneItem)} data-all-cases>
        {cases.map((item, index) => (
          <article
            {...stylex.props(
              styles.column,
              index > 0 && styles.nextCase,
              // Aligns the last line with the theme toggle; a closing ## section already does.
              !parse(markdown[item.slug] ?? "").blocks.some((block) => block.type === "h2") &&
                styles.settle,
            )}
            data-date={item.date}
            data-title={item.title}
            data-scope={item.scope}
          >
            <Article markdown={markdown[item.slug] ?? ""} eager={index === 0} showTitle />
          </article>
        ))}
      </div>
    </Frame>
  );
}

const styles = stylex.create({
  column: { width: `min(100%, ${space.contentColumn})`, marginInline: "auto" },
  phoneItem: {
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    order: { default: null, [media.mobile]: 5 },
  },
  nextCase: {
    marginTop: `calc(${space.caseTitleTextGap} * 1.618)`,
    // Offscreen case studies skip style and layout until they approach the viewport.
    contentVisibility: "auto",
    containIntrinsicSize: "auto 4000px",
  },
  settle: {
    paddingBottom: {
      default: null,
      "@media (min-width: 769px)": `calc(${space.toggleSize} / 2 - 12px)`,
    },
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
}: {
  assets: Assets;
  page: (typeof pages)[number];
  markdown: string;
}) {
  return (
    <Frame
      assets={assets}
      path={`/${page.slug}`}
      type="website"
      description={page.description}
      current={page.name}
      mono={monoBlocks(markdown)}
      head={
        <>
          <Alternates slug={page.slug} name={page.name} />
        </>
      }
    >
      <article {...stylex.props(styles.column, styles.phoneItem)}>
        <Article markdown={markdown} eager showTitle={false} />
      </article>
    </Frame>
  );
}

/** A tool that runs on the page. */
export function ToolPage({ assets, item }: { assets: Assets; item: Tool }) {
  const url = `${origin}/${item.slug}`;
  const others = next(`/${item.slug}`);
  return (
    <Frame
      assets={assets}
      path={`/${item.slug}`}
      type="website"
      description={item.description}
      current={item.name}
      table={others}
      mono={false}
      head={
        <>
          <Alternates />
          <JsonLd
            value={{
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "@id": `${url}#tool`,
              url,
              name: item.name,
              description: item.description,
              applicationCategory: "DesignApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires WebAssembly",
              isAccessibleForFree: true,
              author: { "@type": "Person", "@id": `${origin}/#person`, name: person.name },
              inLanguage: "en",
            }}
          />
        </>
      }
    >
      <div {...stylex.props(styles.column, styles.phoneItem)}>
        <Island name="archetypon" component={Converter} props={{}} />
      </div>
      <Next projects={others} />
    </Frame>
  );
}
