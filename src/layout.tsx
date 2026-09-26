import * as stylex from "@stylexjs/stylex";
import type { ComponentChildren } from "preact";
import { entry, fontGate, timing } from "./entry.ts";
import { Island } from "./island.tsx";
import { Email } from "./islands/email.tsx";
import { ThemeToggle } from "./islands/theme.tsx";
import { align } from "./align.ts";
import { contacts, type Link, person, type Project, profiles, projects } from "./site.ts";
import { themeColor, themeScript } from "./theme.ts";
import { colors, fontFeatures, media, rootMarker, space } from "./tokens.stylex.ts";
import { Figures, type Style, ui, untranslated } from "./ui.tsx";
import { versioned } from "./versioned.ts";

export type Assets = {
  script: string;
  css: string;
  /** The link-preview image rendered at build time (`og.tsx`), stamped with its hash. */
  shareImage: string;
};

// Each face is subset to exactly its range (see README), so declare it to the browser. Inter
// also carries Latin Extended-A, for names such as Bēhance; the monospace face does not need it.
const monoRanges =
  "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2010-205E,U+20AC,U+2122,U+2190-21FF,U+2212,U+2500-257F";
const interRanges = `${monoRanges},U+0100-017F`;

// One URL per face, shared by its @font-face and its preload so the browser fetches it once.
const interUrl = versioned("/fonts/inter.woff2");
const monoUrl = versioned("/fonts/ioskeley-mono.woff2");

/** The few rules StyleX cannot attach to an element, layered beneath StyleX's own layers. */
const globalCss = [
  "@layer reset;",
  `@font-face{font-family:"Inter";font-weight:380 600;font-display:swap;src:url("${interUrl}") format("woff2");unicode-range:${interRanges}}`,
  `@font-face{font-family:"Ioskeley Mono";font-weight:400;font-display:optional;src:url("${monoUrl}") format("woff2");unicode-range:${monoRanges}}`,
  // Arial (or metric-identical Liberation Sans) scaled to Inter's metrics, so text laid out
  // before the web font arrives does not move when it does.
  '@font-face{font-family:"Inter Fallback";src:local("Arial"),local("Liberation Sans");size-adjust:107.35%;ascent-override:90.24%;descent-override:22.47%;line-gap-override:0%}',
  "@layer reset{*{margin:0;padding:0;box-sizing:border-box}}",
  `::selection{color:${colors.bg};background:${colors.primary}}`,
  // A touch shows nothing: no grey tap flash, and no press state takes its place.
  "a,button{-webkit-tap-highlight-color:transparent}",
  // In-page links (skip to content, back to top) glide unless motion is reduced.
  "@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}",
].join("\n");

export function JsonLd({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(value, null, 2).replaceAll("<", "\\u003c"),
      }}
    />
  );
}

/** The HTML document: shared head, theme bootstrap, inlined CSS and the island script. */
export function Document({
  assets,
  title,
  head,
  mono,
  home = false,
  children,
}: {
  assets: Assets;
  title: string;
  head: ComponentChildren;
  /** Preload the monospace face for pages that show code or the terminal demo. */
  mono: boolean;
  home?: boolean;
  children: ComponentChildren;
}) {
  return (
    <html lang="en" {...stylex.props(rootMarker, styles.html, home && styles.fixedViewport)}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Hold the first paint until the whole page is parsed and aligned, so it never arrives
            in pieces or shifts. Preact's typings lack `blocking` on <link>, hence the spread. */}
        <link rel="expect" href="#aligned" {...{ blocking: "render" }} />
        {head}
        {/* The browser chrome takes the page color; a saved theme retargets both (`themeScript`). */}
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={themeColor.dark} />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={themeColor.light} />
        <title>{title}</title>
        <link id="favicon" rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preload" href={interUrl} as="font" type="font/woff2" crossorigin="anonymous" />
        {mono && (
          <link rel="preload" href={monoUrl} as="font" type="font/woff2" crossorigin="anonymous" />
        )}
        <style dangerouslySetInnerHTML={{ __html: `${globalCss}\n${assets.css}` }} />
        {/* After the stylesheet, so the Inter @font-face exists when the gate asks for it. */}
        <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: fontGate }} />
        {/* Low priority keeps the island code out of the first paint. Preact's typings lack
            `fetchpriority` on <script> although browsers support it, hence the spread. */}
        <script
          data-cfasync="false"
          type="module"
          src={assets.script}
          {...{ fetchpriority: "low" }}
        />
      </head>
      <body
        {...stylex.props(
          styles.body,
          home ? [styles.homeBody, styles.fixedViewport] : styles.caseBody,
        )}
        id="top"
        data-intro={person.summary}
      >
        <div
          {...stylex.props(ui.srOnly)}
          id="status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        />
        {children}
        {/* Align the layout before the first paint (see the render-blocking `expect` in <head>). */}
        <script
          data-cfasync="false"
          dangerouslySetInnerHTML={{
            // Also exposed for the font gate, which realigns with the final font before revealing.
            __html: `window.__align=()=>(${align.toString()})(${JSON.stringify(space.sectionContentGap.slice(4, -1))});window.__align()`,
          }}
        />
        <div id="aligned" hidden />
      </body>
    </html>
  );
}

/**
 * Two columns on desktop (sidebar, content), one flowing grid on phones where the sidebar and
 * content dissolve (`display: contents`) so their children can be ordered together.
 */
export function Shell({ home = false, children }: { home?: boolean; children: ComponentChildren }) {
  return (
    <div {...stylex.props(styles.wrapper)}>
      <div {...stylex.props(styles.layout, home && styles.homeLayout)}>{children}</div>
    </div>
  );
}

export function Sidebar({
  home = false,
  label,
  children,
}: {
  home?: boolean;
  label: { "aria-label": string } | { "aria-labelledby": string };
  children: ComponentChildren;
}) {
  return (
    <aside {...stylex.props(styles.sidebar, home && styles.homeColumn)} {...label}>
      <a {...stylex.props(ui.heading, ui.focusRing, styles.skip)} href="#content">
        <span data-nosnippet>Skip to content</span>
      </a>
      {children}
      <Island name="theme" component={ThemeToggle} props={{ style: home && styles.homeToggle }} />
    </aside>
  );
}

export function Main({ home = false, children }: { home?: boolean; children: ComponentChildren }) {
  return (
    <main
      {...stylex.props(
        styles.content,
        home ? [styles.homeColumn, styles.homeContent] : styles.caseContent,
      )}
    >
      {/* The skip link's target. `<main>` itself cannot take focus on phones, where it is
          `display: contents`; this marker can, and being out of flow it takes no grid cell. */}
      <span {...stylex.props(styles.skipTarget)} id="content" tabIndex={-1} />
      {children}
    </main>
  );
}

/** Site name, or on inner pages a breadcrumb back to it. */
export function Name({ current }: { current?: string }) {
  return current ? (
    <p {...stylex.props(ui.heading, styles.name, styles.caseName)}>
      <a {...stylex.props(ui.target, ui.focusRing, styles.home)} href="/" {...untranslated}>
        Gil Rodrigues
      </a>
      <span {...stylex.props(styles.arrow)} aria-hidden="true">
        →
      </span>
      <a {...stylex.props(ui.target, ui.focusRing, styles.current)} href="#top">
        {current}
      </a>
    </p>
  ) : (
    <h1 {...stylex.props(ui.heading, styles.name, styles.homeName)} id="site-title" itemprop="name">
      <span data-nosnippet {...untranslated}>
        Gil Rodrigues
      </span>
    </h1>
  );
}

/**
 * On inner pages the links sit in the sidebar on desktop and below the content on phones.
 * `table` is the project list the page shows, which the phone links align to (see `Links`).
 */
export function PageLinks({
  phone,
  table = projects,
}: {
  phone: boolean;
  table?: readonly Project[];
}) {
  return (
    <div {...stylex.props(phone ? styles.phoneOnly : styles.desktopOnly)}>
      <Links phone={phone} table={table} />
    </div>
  );
}

/**
 * Profile and contact links. On phones they share the columns of the page's project table:
 * hidden ruler cells carry the date and title of every project in `table`, so the contact
 * column starts exactly where that table's scope column does. A case study passes its own list,
 * which leaves out itself and the external projects; pages without a table use the homepage's.
 */
export function Links({
  home = false,
  phone = false,
  table = projects,
}: {
  home?: boolean;
  phone?: boolean;
  table?: readonly Project[];
}) {
  const rise = home && entry.rise;
  const stagger = (index: number) => ({
    "--entry-delay": `${timing.link.desktop[index]}ms`,
    "--entry-delay-mobile": `${timing.link.phone[index]}ms`,
  });
  const link = (item: Link, index: number, placement: Style, me: boolean, row?: number) => {
    return (
      <a
        {...stylex.props(ui.quiet, ui.focusRing, ui.outbound, styles.link, placement, rise)}
        // Phones place each profile link on its own grid row; flex ignores it on desktop.
        style={{ ...(home && stagger(index)), ...(row !== undefined && { gridRow: String(row) }) }}
        href={item.href}
        target="_blank"
        rel={me ? "me noopener noreferrer" : "noopener noreferrer"}
        itemprop={me ? "sameAs" : undefined}
        {...untranslated}
      >
        <span data-nosnippet>{item.label}</span>
      </a>
    );
  };
  return (
    <nav
      {...stylex.props(
        ui.text,
        styles.links,
        home ? [styles.homeLinks, entry.fade] : styles.caseLinks,
      )}
      style={
        home
          ? {
              "--entry-delay": `${timing.links.desktop}ms`,
              "--entry-delay-mobile": `${timing.links.phone}ms`,
            }
          : undefined
      }
      aria-label="Public profiles and contact"
      data-mobile-links={phone || home || undefined}
    >
      {(phone || home) &&
        table.flatMap((project) => [
          <span
            {...stylex.props(ui.text, styles.ruler, styles.rulerDate)}
            aria-hidden="true"
            data-nosnippet
          >
            <Figures text={project.date.slice(0, 7)} />
          </span>,
          <span
            {...stylex.props(ui.text, styles.ruler, styles.rulerTitle)}
            aria-hidden="true"
            data-nosnippet
          >
            {project.title}
          </span>,
        ])}
      <p
        {...stylex.props(styles.label, styles.profileLabel, styles.profileGroup, rise)}
        style={home ? stagger(0) : undefined}
      >
        <span data-nosnippet>Links</span>
      </p>
      {profiles.map((item, index) =>
        link(item, index + 1, [styles.profile, styles.profileGroup], true, index + 2),
      )}
      <p
        {...stylex.props(styles.label, styles.contact, styles.contactLabel, rise)}
        style={home ? stagger(6) : undefined}
      >
        <span data-nosnippet>Contact</span>
      </p>
      <Island
        name="email"
        component={Email}
        props={{
          style: [styles.contact, styles.emailRow, rise],
          ...(home && { vars: stagger(7) }),
        }}
      />
      {contacts.map((item, index) =>
        link(item, index + 8, [styles.contact, index ? styles.fourthRow : styles.thirdRow], false),
      )}
    </nav>
  );
}

/**
 * humans.txt and llms.txt, and Source in the column where the project table's Scope starts:
 * hidden ruler cells carry every project's date and title, sizing the first two columns exactly
 * as the table's (see `Links`, which does the same on phones).
 */
export function Metadata({ style }: { style?: Style }) {
  return (
    <footer {...stylex.props(style)}>
      <nav {...stylex.props(ui.text, styles.metadata)} aria-label="Metadata">
        {projects.flatMap((project) => [
          <span
            {...stylex.props(ui.text, styles.footRuler, styles.rulerDate)}
            aria-hidden="true"
            data-nosnippet
          >
            <Figures text={project.date} />
          </span>,
          <span
            {...stylex.props(ui.text, styles.footRuler, styles.rulerTitle)}
            aria-hidden="true"
            data-nosnippet
          >
            {project.title}
          </span>,
        ])}
        {[
          { href: "/humans.txt", label: "humans.txt", rel: "author", type: "text/plain" },
          { href: "/llms.txt", label: "llms.txt", rel: "alternate", type: "text/markdown" },
        ].map(({ href, label, rel, type }, index) => (
          <a
            {...stylex.props(ui.quiet, ui.focusRing, styles.link, styles.file)}
            style={{ gridRow: String(index + 1) }}
            href={href}
            rel={rel}
            type={type}
          >
            {label}
          </a>
        ))}
        <a
          {...stylex.props(ui.quiet, ui.focusRing, ui.outbound, styles.link, styles.source)}
          href="https://github.com/gildrb/web"
          rel="noopener noreferrer"
          target="_blank"
        >
          Source
        </a>
      </nav>
    </footer>
  );
}

/** The phone page's side margin; the sticky name bar bleeds across it to the viewport edge. */
const phoneGutter = "12px";

const styles = stylex.create({
  // The background lives on <html> too, so the held first frame is already the theme color.
  html: {
    scrollbarGutter: { default: null, [media.desktop]: "stable" },
    backgroundColor: colors.bg,
    colorScheme: colors.scheme,
  },
  /**
   * The phone homepage fits the viewport; only the project list scrolls. So does the dense desktop
   * one, by design; clipping covers heights too short for even its compact sidebar, so a
   * scrollbar never appears.
   */
  fixedViewport: {
    height: { default: null, [media.mobile]: "100dvh" },
    minHeight: { default: null, [media.mobile]: "100dvh" },
    overflow: {
      default: null,
      [media.mobile]: "hidden",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "hidden" },
    },
  },
  body: {
    // Held hidden by the font gate until Inter is ready; see `fontGate`.
    visibility: "var(--first-paint, visible)",
    backgroundColor: colors.bg,
    color: colors.primary,
    fontFamily:
      'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFeatureSettings: fontFeatures.interface,
    fontWeight: 400,
    // Every element sets its own size; this keeps stray whitespace from adding height.
    fontSize: "1px",
    lineHeight: 1.5,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    WebkitTextSizeAdjust: "100%",
    textRendering: "optimizeLegibility",
  },
  homeBody: { minHeight: "100dvh" },
  caseBody: { minHeight: "100vh" },
  wrapper: {
    maxWidth: "1900px",
    margin: "0 auto",
    // A minimum margin: the layout keeps its full width until the viewport cannot fit it.
    paddingInline: { default: "32px", [media.mobile]: phoneGutter },
  },
  layout: {
    display: "grid",
    gridTemplateColumns: {
      default: `${space.sidebarColumn} 1fr`,
      [media.mobile]: `minmax(0, 1fr) ${space.toggleSize}`,
    },
    maxWidth: `calc(${space.sidebarColumn} + ${space.layoutGap} + ${space.contentColumn})`,
    margin: "0 auto",
    minHeight: { default: "100vh", [media.mobile]: "auto" },
    gap: { default: space.layoutGap, [media.mobile]: 0 },
  },
  homeLayout: {
    gridTemplateRows: {
      default: null,
      [media.desktop]: "auto minmax(min-content, 1fr) auto",
      [media.mobile]: "auto auto minmax(0, 1fr) auto",
      // Dense: like on phones, the page holds to the viewport and the project list scrolls. The
      // list's row still grows to fit the sidebar links, so those are never cut off.
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "auto 1fr auto" },
    },
    rowGap: 0,
    paddingBlock: { default: null, [media.desktop]: space.pageInset },
    height: {
      default: null,
      [media.mobile]: "100dvh",
      [stylex.when.ancestor("[data-dense]", rootMarker)]: { [media.desktop]: "100dvh" },
    },
    // The positioning box for the theme toggle once the viewport is dense.
    position: { default: null, [media.desktop]: "relative" },
    minHeight: "100dvh",
    alignContent: { default: null, [media.mobile]: "start" },
  },
  sidebar: {
    position: { default: "sticky", [media.mobile]: "relative" },
    top: 0,
    zIndex: 100,
    height: { default: "100vh", [media.mobile]: "auto" },
    padding: { default: `${space.pageInset} 0`, [media.mobile]: 0 },
    display: { default: "flex", [media.mobile]: "contents" },
    flexDirection: "column",
  },
  /** Homepage desktop: sidebar and content share three subgrid rows (intro, lists, footer). */
  homeColumn: {
    position: { default: null, [media.desktop]: "static" },
    display: { default: null, [media.desktop]: "grid", [media.mobile]: "contents" },
    gridRow: { default: null, [media.desktop]: "1 / 4" },
    gridTemplateRows: { default: null, [media.desktop]: "subgrid" },
    height: { default: null, [media.desktop]: "auto" },
    minHeight: { default: null, [media.desktop]: 0 },
    padding: { default: null, [media.desktop]: 0 },
  },
  content: {
    minWidth: 0,
    width: "100%",
    maxWidth: space.contentColumn,
    padding: { default: `${space.pageInset} 0`, [media.mobile]: 0 },
    display: { default: "flex", [media.mobile]: "contents" },
    flexDirection: "column",
  },
  // Focused only through the skip link, which is its own cue.
  skipTarget: { position: "absolute", outline: "none" },
  /**
   * Hidden until focused, then set exactly over the name: same type, same place (the sidebar's
   * inset on desktop, the name bar's padding on phones), on the page color.
   */
  skip: {
    position: { default: "absolute", [media.mobile]: "fixed" },
    top: { default: space.pageInset, [media.mobile]: space.sectionGap },
    left: { default: 0, [media.mobile]: phoneGutter },
    zIndex: 102,
    lineHeight: space.linkLineHeight,
    textDecoration: "none",
    backgroundColor: colors.bg,
    clipPath: { default: "inset(50%)", ":focus-visible": "none" },
  },
  homeContent: { gridColumn: { default: null, [media.desktop]: 2 } },
  caseContent: { minHeight: "100vh", fontSize: "16px", lineHeight: "26px" },
  homeToggle: {
    gridRow: { default: null, [media.mobile]: 1 },
    // Dense: centered over the table's arrows, whose column ends at the layout's right edge.
    right: {
      default: null,
      [stylex.when.ancestor("[data-dense]", rootMarker)]: {
        [media.desktop]: `calc((${space.arrowWidth} - ${space.toggleSize}) / 2)`,
      },
    },
  },
  name: {
    lineHeight: space.linkLineHeight,
    // JavaScript measures the homepage intro and publishes its height, so the sidebar
    // lines up with the content column on every page.
    minHeight: { default: `calc(${space.linkLineHeight} * 2)`, [media.mobile]: 0 },
    marginBottom: { default: space.textMediaGap, [media.mobile]: space.sectionGap },
    alignContent: "start",
    gridColumn: { default: null, [media.mobile]: 1 },
    order: { default: null, [media.mobile]: 1 },
    position: { default: null, [media.mobile]: "sticky" },
    top: { default: null, [media.mobile]: 0 },
    zIndex: { default: null, [media.mobile]: 100 },
    // Bleeds across both gutters and the toggle column, and pads back to the text column.
    width: {
      default: null,
      [media.mobile]: `calc(100% + ${phoneGutter} * 2 + ${space.toggleSize})`,
    },
    marginLeft: { default: null, [media.mobile]: `calc(${phoneGutter} * -1)` },
    padding: {
      default: null,
      [media.mobile]: `${space.sectionGap} calc(${space.toggleSize} + ${phoneGutter}) 8px ${phoneGutter}`,
    },
    backgroundImage: {
      default: null,
      [media.mobile]: `linear-gradient(to bottom, ${colors.bg} 60%, transparent)`,
    },
  },
  homeName: {
    fontSize: { default: "19px", [media.desktop]: "1.1875rem" },
    minHeight: {
      default: null,
      [media.desktop]: "var(--desktop-intro-height, 0px)",
      [media.mobile]: 0,
    },
    gridRow: 1,
    alignSelf: "start",
  },
  caseName: {
    display: "flex",
    flexWrap: { default: "wrap", [media.mobile]: "nowrap" },
    columnGap: "8px",
    whiteSpace: "nowrap",
    minHeight: {
      default: null,
      [media.desktop]: `var(--desktop-intro-height, calc(${space.linkLineHeight} * 2 + ${space.sectionContentGap}))`,
      [media.mobile]: 0,
    },
  },
  home: {
    flexBasis: { default: "100%", [media.mobile]: "auto" },
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
    },
    textDecoration: "none",
  },
  arrow: { color: colors.tertiary },
  current: { color: colors.primary, textDecoration: "none" },
  desktopOnly: { display: { default: "contents", [media.mobile]: "none" } },
  phoneOnly: { display: { default: "none", [media.mobile]: "contents" } },
  links: {
    display: { default: "flex", [media.mobile]: "grid" },
    flexDirection: "column",
    rowGap: space.linkGap,
    gridTemplateColumns: { default: null, [media.mobile]: space.tableColumns },
    columnGap: { default: null, [media.mobile]: space.mobileTableGap },
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
  },
  homeLinks: {
    gridRow: { default: null, [media.desktop]: 2, [media.mobile]: 4 },
    alignSelf: { default: null, [media.desktop]: "start", [media.mobile]: "end" },
    paddingBottom: { default: null, [media.mobile]: "24px" },
  },
  caseLinks: {
    order: { default: null, [media.mobile]: 6 },
    marginTop: { default: null, [media.mobile]: space.sectionGap },
  },
  label: { color: colors.secondary, width: "fit-content" },
  profileLabel: {
    marginTop: { default: null, [media.desktop]: space.sidebarBaselinePitch },
    gridRow: { default: null, [media.mobile]: 1 },
    gridColumn: { default: null, [media.mobile]: "1 / 3" },
  },
  /**
   * A table cell's width without its height: the date and title columns size to every project,
   * exactly as the homepage table's do, while the rulers themselves take no space or voice.
   */
  ruler: {
    display: { default: "none", [media.mobile]: "block" },
    gridRow: 1,
    height: 0,
    overflow: "hidden",
    visibility: "hidden",
    whiteSpace: "nowrap",
    paddingInlineEnd: space.mobileCellEndSpace,
  },
  rulerDate: { gridColumn: 1 },
  rulerTitle: { gridColumn: 2 },
  /** The project table's columns, so Source lines up with its Scope. */
  metadata: {
    display: "grid",
    gridTemplateColumns: space.tableColumns,
    columnGap: space.tableGap,
    rowGap: space.linkGap,
    alignItems: "baseline",
    // Centers the last line on the theme toggle beside it.
    paddingBottom: `calc((${space.toggleSize} - ${space.linkLineHeight}) / 2)`,
  },
  /** A desktop `ruler`: the table's own columns, with no height or voice. */
  footRuler: {
    gridRow: 1,
    height: 0,
    overflow: "hidden",
    visibility: "hidden",
    whiteSpace: "nowrap",
  },
  file: { gridColumn: "1 / 3", justifySelf: "start" },
  source: { gridColumn: 3, gridRow: 2, justifySelf: "start" },
  /** Compact (a dense homepage too short for the whole sidebar, see `align.ts`): contact stays. */
  profileGroup: {
    display: {
      default: null,
      [stylex.when.ancestor("[data-compact]", rootMarker)]: { [media.desktop]: "none" },
    },
  },
  link: {
    paddingBlock: `calc(${space.linkGap} / 2)`,
    marginBlock: `calc(${space.linkGap} / -2)`,
  },
  profile: {
    gridColumn: { default: null, [media.mobile]: "1 / 3" },
    justifySelf: "start",
    width: { default: "fit-content", [media.mobile]: "max-content" },
  },
  contact: {
    order: { default: null, [media.desktop]: -1 },
    gridColumn: { default: null, [media.mobile]: "3 / -1" },
    justifySelf: "start",
  },
  contactLabel: {
    marginTop: {
      default: `calc(${space.sectionGap} - ${space.sectionContentGap})`,
      [media.desktop]: 0,
      [media.mobile]: 0,
    },
    gridRow: { default: null, [media.mobile]: 1 },
  },
  emailRow: { gridRow: { default: null, [media.mobile]: 2 } },
  thirdRow: { gridRow: { default: null, [media.mobile]: 3 } },
  fourthRow: { gridRow: { default: null, [media.mobile]: 4 } },
});
