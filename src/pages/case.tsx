import * as stylex from "@stylexjs/stylex";
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
import { type Case, cases, origin, pages, person, projects } from "../site.ts";
import { colors, media, space } from "../tokens.stylex.ts";
import { versioned } from "../versioned.ts";

const monoBlocks = (markdown: string) =>
  parse(markdown).blocks.some(
    (block) =>
      block.type === "code" ||
      (block.type === "media" && block.items.some(({ id }) => id === "heph-demo")),
  );

/** Every inner page's tab reads like its breadcrumb: "Gil Rodrigues → T3". */
function Frame({
  assets,
  description,
  current,
  head,
  mono,
  children,
}: {
  assets: Assets;
  description: string;
  current: string;
  head: preact.ComponentChildren;
  mono: boolean;
  children: preact.ComponentChildren;
}) {
  return (
    <Document
      assets={assets}
      title={`${person.name} → ${current}`}
      mono={mono}
      head={
        <>
          <meta name="description" content={description} />
          <meta name="author" content="Gil Rodrigues" />
          <meta name="creator" content="Gil Rodrigues" />
          <meta name="robots" content="index, follow, max-image-preview:large" />
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
        <PageLinks phone />
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
        title="LLM reference for Gil Rodrigues"
      />
      <link
        rel="alternate"
        type="text/markdown"
        href={`${origin}/llms-full.txt`}
        title="Full public website text for Gil Rodrigues"
      />
      {slug && (
        <link
          rel="alternate"
          type="text/markdown"
          href={`${origin}/content/${slug}.md`}
          title={`Markdown source for ${name}`}
        />
      )}
      <link
        rel="describedby"
        type="application/ld+json"
        href={`${origin}/profile.json`}
        title="Structured profile for Gil Rodrigues"
      />
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
  const image = item.ogImage && `${origin}${versioned(`/images/optimized/${item.ogImage}`)}`;
  return (
    <Frame
      assets={assets}
      description={item.description}
      current={item.name}
      mono={monoBlocks(markdown)}
      head={
        <>
          <link rel="canonical" href={url} />
          <Alternates slug={item.slug} name={item.name} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={url} />
          <meta property="og:title" content={`${person.name} → ${item.name}`} />
          <meta property="og:description" content={item.ogDescription} />
          {image && <meta property="og:image" content={image} />}
          <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
          <meta name="twitter:title" content={`${person.name} → ${item.name}`} />
          <meta name="twitter:description" content={item.ogDescription} />
          {image && <meta name="twitter:image" content={image} />}
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
                name: "Gil Rodrigues",
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
      <nav
        {...stylex.props(styles.column, styles.phoneItem, styles.next)}
        aria-label="All projects"
      >
        <h2 {...stylex.props(styles.nextHeading)}>View next</h2>
        <div {...stylex.props(styles.nextList)}>
          {projects
            .filter((project) => !project.external && project.href !== `/${item.slug}`)
            .map((project, index) => (
              <Row project={project} first={index === 0} home={false} />
            ))}
        </div>
      </nav>
    </Frame>
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
  const description = "All case studies by Gil Rodrigues.";
  return (
    <Frame
      assets={assets}
      description={description}
      current="All"
      mono
      head={
        <>
          <link rel="canonical" href={`${origin}/all`} />
          <Alternates />
          <HeroPreload markdown={markdown[cases[0]?.slug ?? ""] ?? ""} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`${origin}/all`} />
          <meta property="og:title" content={`${person.name} → All`} />
          <meta property="og:description" content={description} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={`${person.name} → All`} />
          <meta name="twitter:description" content={description} />
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
  nextHeading: {
    margin: "0 0 8px",
    color: colors.tertiary,
    fontSize: "16px",
    fontWeight: 400,
    lineHeight: "24px",
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
  const url = `${origin}/${page.slug}`;
  const title = `${person.name} → ${page.name}`;
  return (
    <Frame
      assets={assets}
      description={page.description}
      current={page.name}
      mono={monoBlocks(markdown)}
      head={
        <>
          <link rel="canonical" href={url} />
          <Alternates slug={page.slug} name={page.name} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={url} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={page.description} />
          <meta name="twitter:card" content="summary" />
        </>
      }
    >
      <article {...stylex.props(styles.column, styles.phoneItem)}>
        <Article markdown={markdown} eager showTitle={false} />
      </article>
    </Frame>
  );
}
