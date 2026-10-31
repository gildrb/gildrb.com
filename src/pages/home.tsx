import * as stylex from "@stylexjs/stylex";
import type { Work } from "../archive.tsx";
import { profile } from "../files.ts";
import { Island } from "../island.tsx";
import { Portfolio } from "../islands/portfolio.tsx";
import { type Assets, Document, JsonLd, Links, Main, Name, Shell, Sidebar } from "../layout.tsx";
import { developers, origin, person, profiles, projects } from "../site.ts";
import { media, space } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";
import { shareFrame } from "../og.tsx";

const title = `${person.name} (${person.handle})`;

/** What search results show under the name: the About text, then the projects by name. */
const description = `${person.about} Projects: ${projects.map((project) => project.title).join(", ")}.`;

/** Machine-readable versions of this page, advertised to crawlers and agents. */
const alternates: [rel: string, type: string, path: string, title: string][] = [
  ["alternate", "text/markdown", "/index.html.md", "Markdown version"],
  ["alternate", "text/markdown", "/llms.txt", "LLM reference"],
  ["alternate", "text/markdown", "/llms-full.txt", "Full site text"],
  ["alternate", "application/rss+xml", "/feed.xml", "Feed"],
  ["author", "text/plain", "/humans.txt", "humans.txt"],
  ["sitemap", "application/xml", "/sitemap.xml", "Sitemap"],
  // RFC 8631: the service documentation, found by agents without any text on the page.
  ["service-doc", "text/html", `/${developers.slug}`, developers.description],
];

function Head({ shareImage }: { shareImage: string }) {
  return (
    <>
      <meta name="description" content={description} />
      <meta name="author" content={person.name} />
      <meta
        name="robots"
        content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
      />
      <link rel="canonical" href={`${origin}/`} />
      {alternates.map(([rel, type, path, linkTitle]) => (
        <link key={path} rel={rel} type={type} href={`${origin}${path}`} title={linkTitle} />
      ))}
      {profiles.map(({ href }) => (
        <link key={href} rel="me" href={href} />
      ))}
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={`${origin}/`} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={person.name} />
      <meta property="og:image" content={`${origin}${shareImage}`} />
      <meta property="og:image:width" content={String(shareFrame.width)} />
      <meta property="og:image:height" content={String(shareFrame.height)} />
      <meta property="og:image:alt" content={title} />
      <meta property="profile:first_name" content={person.givenName} />
      <meta property="profile:last_name" content={person.familyName} />
      <meta property="profile:username" content={person.handle} />
      <meta name="twitter:card" content="summary_large_image" />
      <JsonLd value={profile} />
    </>
  );
}

export function Home({ assets, work }: { assets: Assets; work: readonly Work[] }) {
  return (
    <Document
      assets={assets}
      title={title}
      head={<Head shareImage={assets.shareImage} />}
      mono={false}
      home
    >
      <Shell home>
        <Sidebar home label={{ "aria-labelledby": "site-title" }}>
          <Name />
          <Links home />
        </Sidebar>
        <Main home>
          <section {...stylex.props(styles.summary)} aria-labelledby="profile-summary-title">
            <h2 {...stylex.props(ui.label, styles.heading)} id="profile-summary-title">
              About
            </h2>
            <p {...stylex.props(ui.text)}>{person.about}</p>
          </section>
          <Island
            name="portfolio"
            component={Portfolio}
            props={{ more: work.filter(({ from }) => from.$ === "Archive").length }}
          />
        </Main>
      </Shell>
    </Document>
  );
}

const styles = stylex.create({
  summary: {
    maxWidth: space.contentColumn,
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    gridRow: { default: null, [media.desktop]: 1, [media.mobile]: 3 },
    alignSelf: { default: null, [media.desktop]: "start" },
    minHeight: { default: null, [media.desktop]: "var(--desktop-intro-height, 0px)" },
    // Phones: the table's label baseline two line intervals (64px) below the About line's, as on
    // desktop; the label's own touch inset is part of that distance.
    marginBottom: {
      default: space.groupGap,
      [media.mobile]: `calc(8 * ${space.unit} - ${space.linkLineHeight} - ${space.touchInset})`,
    },
  },
  /** Desktop: the About line one line interval below its label (`linkGap`, as in the sidebar). */
  heading: {
    marginBottom: { default: space.sectionContentGap, [media.desktop]: space.linkGap },
  },
});
