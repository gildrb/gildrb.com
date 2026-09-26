import * as stylex from "@stylexjs/stylex";
import { profile } from "../files.ts";
import { Island } from "../island.tsx";
import { Portfolio } from "../islands/portfolio.tsx";
import {
  type Assets,
  Document,
  JsonLd,
  Links,
  Main,
  Metadata,
  Name,
  Shell,
  Sidebar,
} from "../layout.tsx";
import { developers, origin, person, profiles } from "../site.ts";
import { colors, media, rootMarker, space } from "../tokens.stylex.ts";
import { ui } from "../ui.tsx";
import { shareFrame } from "../og.tsx";

const title = person.name;

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
      <meta name="description" content={person.summary} />
      <meta name="author" content={person.name} />
      <meta
        name="robots"
        content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
      />
      <link rel="canonical" href={`${origin}/`} />
      {alternates.map(([rel, type, path, linkTitle]) => (
        <link rel={rel} type={type} href={`${origin}${path}`} title={linkTitle} />
      ))}
      {profiles.map(({ href }) => (
        <link rel="me" href={href} />
      ))}
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={`${origin}/`} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={person.summary} />
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

export function Home({ assets }: { assets: Assets }) {
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
            <h2 {...stylex.props(ui.text, styles.heading)} id="profile-summary-title">
              <span data-nosnippet>About</span>
            </h2>
            <p {...stylex.props(ui.text)}>{person.summary}</p>
          </section>
          <Island name="portfolio" component={Portfolio} props={{}} />
          <Metadata style={styles.footer} />
        </Main>
      </Shell>
    </Document>
  );
}

const styles = stylex.create({
  summary: {
    maxWidth: space.contentColumn,
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
    gridRow: { default: null, [media.desktop]: 1, [media.mobile]: 2 },
    alignSelf: { default: null, [media.desktop]: "start" },
    minHeight: { default: null, [media.desktop]: "var(--desktop-intro-height, 0px)" },
    marginBottom: { default: space.textMediaGap, [media.mobile]: space.sectionGap },
  },
  heading: { color: colors.secondary, marginBottom: space.sectionContentGap },
  footer: {
    display: {
      default: null,
      [media.mobile]: "none",
      // Too short a viewport: the table matters more than the metadata.
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "none" },
    },
    gridRow: { default: null, [media.desktop]: 3 },
    alignSelf: { default: null, [media.desktop]: "center" },
    position: { default: null, [media.desktop]: "sticky" },
    bottom: { default: null, [media.desktop]: space.pageInset },
    minHeight: { default: null, [media.desktop]: space.toggleSize },
  },
});
