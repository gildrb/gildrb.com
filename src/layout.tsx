import * as stylex from "@stylexjs/stylex";
import type { ComponentChildren } from "preact";
import { fontGate } from "./entry.ts";
import { Island } from "./island.tsx";
import { Email } from "./islands/email.tsx";
import { ThemeToggle } from "./islands/theme.tsx";
import { align } from "./align.ts";
import { contacts, type Link, origin, person, profiles } from "./site.ts";
import { themeColor, themeCss, themeScript } from "./theme.ts";
import { colors, fontFeatures, media, rootMarker, space, typeScale } from "./tokens.stylex.ts";
import { type Style, ui, untranslated } from "./ui.tsx";
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
const monoUrl = versioned("/fonts/commit-mono.woff2");

/** The few rules StyleX cannot attach to an element, layered beneath StyleX's own layers. */
const globalCss = [
  "@layer reset;",
  `@font-face{font-family:"Inter";font-weight:380 600;font-display:swap;src:url("${interUrl}") format("woff2");unicode-range:${interRanges}}`,
  `@font-face{font-family:"Commit Mono";font-weight:400;font-display:optional;src:url("${monoUrl}") format("woff2");unicode-range:${monoRanges}}`,
  // Arial (or metric-identical Liberation Sans) scaled to Inter's metrics, so text laid out
  // before the web font arrives does not move when it does.
  '@font-face{font-family:"Inter Fallback";src:local("Arial"),local("Liberation Sans");size-adjust:107.35%;ascent-override:90.24%;descent-override:22.47%;line-gap-override:0%}',
  "@layer reset{*{margin:0;padding:0;box-sizing:border-box}}",
  `::selection{color:${colors.bg};background:${colors.primary}}`,
  // A touch shows nothing: no grey tap flash, and no press state takes its place.
  "a,button{-webkit-tap-highlight-color:transparent}",
  // In-page links (skip to content, back to top) glide unless motion is reduced. Moving between
  // pages has no transition: a cross-document one freezes the page until it ends, so Back or
  // another click during it cannot cancel it and shows a flash. The browser swaps pages at once,
  // and the sidebar, the same on every page, stays as it is.
  "@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}",
].join("\n");

// Also exposed for the font gate, which realigns with the final font before revealing.
const alignScript = `window.__align=()=>(${align.toString()})(${scriptJson(space.sectionContentGap.slice(4, -1))});window.__align()`;

/**
 * Chrome prerenders a page of this site once a pointer rests on its link (about 200ms) or presses
 * it, so the page opens whole, images included. Files (`.md`, `.xml`, downloads) are left alone.
 * Other browsers ignore this; `ahead.ts` loads the images there.
 */
const speculationRules = scriptJson({
  prerender: [
    {
      where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/*.*" } }] },
      eagerness: "moderate",
    },
  ],
});

/**
 * JSON safe inside a `<script>`: `<`, `>` and `&` cannot close the element or open a comment,
 * and the line separators JavaScript once rejected in strings are escaped too.
 */
export function scriptJson(value: unknown, indent?: number): string {
  return JSON.stringify(value, null, indent)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function JsonLd({ value }: { value: unknown }) {
  const json = scriptJson(value, 2);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
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
    <html
      lang="en"
      {...stylex.props(rootMarker, styles.html, home && [styles.fixedViewport, styles.homeRoot])}
    >
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* The page color first, so no frame shows the browser's white canvas (see `themeCss`).
            The theme script needs the favicon and theme-color tags, so they come before it. */}
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <meta name="theme-color" content={themeColor.dark} />
        <link id="favicon" rel="icon" type="image/svg+xml" href="/favicon.svg?v=4" />
        <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Hold the first paint until the whole page is parsed and aligned, so it never arrives
            in pieces or shifts. Preact's typings lack `blocking` on <link>, hence the spread. */}
        <link rel="expect" href="#aligned" {...{ blocking: "render" }} />
        {head}
        <title>{title}</title>
        <link rel="preload" href={interUrl} as="font" type="font/woff2" crossOrigin="anonymous" />
        {mono && (
          <link rel="preload" href={monoUrl} as="font" type="font/woff2" crossOrigin="anonymous" />
        )}
        <style dangerouslySetInnerHTML={{ __html: `${globalCss}\n${assets.css}` }} />
        {/* After the stylesheet, so the Inter @font-face exists when the gate asks for it. */}
        <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: fontGate }} />
        <script type="speculationrules" dangerouslySetInnerHTML={{ __html: speculationRules }} />
        {/* High priority: the page reacts to the pointer (the Contents list, the enlargement) as
            soon as it shows. A module script never blocks the first paint. Preact's typings lack
            `fetchpriority` on <script> although browsers support it, hence the spread. */}
        <script
          data-cfasync="false"
          type="module"
          src={assets.script}
          {...{ fetchpriority: "high" }}
        />
      </head>
      <body
        {...stylex.props(
          ui.sans,
          styles.body,
          home ? [styles.homeBody, styles.fixedViewport] : styles.caseBody,
        )}
        id="top"
        data-intro={person.about}
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
        <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: alignScript }} />
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
        home ? [styles.homeColumn, styles.homeContent] : [ui.text, styles.caseContent],
      )}
    >
      {/* The skip link's target. `<main>` itself cannot take focus on phones, where it is
          `display: contents`; this marker can, and being out of flow it takes no grid cell. */}
      <span {...stylex.props(styles.skipTarget)} id="content" tabIndex={-1} />
      {children}
    </main>
  );
}

/**
 * Site name, or on inner pages a breadcrumb back to it: the name in grey on top, the page below it in full contrast. The name links to gildrb.com by its full
 * URL: product pages live on their own hosts, where `/` is the product page itself. A page with no
 * heading of its own (the archive) makes the breadcrumb its `<h1>`. On the homepage, phones make
 * the name a button that shows and hides Contact and Links (`links.ts`).
 */
export function Name({ current, heading = false }: { current?: string; heading?: boolean }) {
  const Tag = heading ? "h1" : "p";
  return current ? (
    <Tag {...stylex.props(ui.heading, styles.name, styles.caseName)}>
      <a
        {...stylex.props(ui.target, ui.focusRing, ui.respond, styles.home)}
        href={`${origin}/`}
        {...untranslated}
      >
        Gil Rodrigues
      </a>
      <a {...stylex.props(ui.target, ui.focusRing, styles.current)} href="#top">
        {current}
      </a>
    </Tag>
  ) : (
    <h1
      {...stylex.props(ui.heading, styles.name, styles.homeName)}
      id="site-title"
      itemProp="name"
      // Named by its text alone: the button inside is named after it too and would read twice.
      aria-labelledby="site-name"
      {...untranslated}
    >
      <span id="site-name">Gil Rodrigues</span>
      <button
        {...stylex.props(ui.reset, ui.focusRing, styles.linksToggle)}
        type="button"
        aria-labelledby="site-name"
        aria-expanded="false"
        aria-controls="profile-links"
        data-links-toggle
      />
    </h1>
  );
}

/** On inner pages the links sit in the sidebar on desktop and below the content on phones. */
export function PageLinks({ phone }: { phone: boolean }) {
  return (
    <div {...stylex.props(phone ? styles.phoneOnly : styles.desktopOnly)}>
      <Links phone={phone} />
    </div>
  );
}

/**
 * Contact, then the profile links: one list above the other on every screen. The homepage's
 * stay hidden on phones until the name is tapped (`links.ts`), then sit right under it.
 */
export function Links({ home = false, phone = false }: { home?: boolean; phone?: boolean }) {
  const link = (item: Link, placement: Style, me: boolean) => {
    return (
      <a
        {...stylex.props(ui.quiet, ui.respond, ui.focusRing, styles.link, placement)}
        href={item.href}
        target="_blank"
        rel={me ? "me noopener noreferrer" : "noopener noreferrer"}
        itemProp={me ? "sameAs" : undefined}
        {...untranslated}
      >
        <span data-nosnippet>{item.label}</span>
      </a>
    );
  };
  return (
    <nav
      {...stylex.props(ui.text, styles.links, home ? styles.homeLinks : styles.caseLinks)}
      id={home ? "profile-links" : undefined}
      aria-label="Public profiles and contact"
      data-mobile-links={phone || home || undefined}
    >
      <p {...stylex.props(ui.label, styles.label, styles.contactLabel)}>
        <span data-nosnippet>Contact</span>
      </p>
      <Island name="email" component={Email} props={{}} />
      {contacts.map((item) => link(item, null, false))}
      <p {...stylex.props(ui.label, styles.label, styles.profileLabel, styles.profileGroup)}>
        <span data-nosnippet>Links</span>
      </p>
      {profiles.map((item) => link(item, styles.profileGroup, true))}
    </nav>
  );
}

/**
 * src, humans.txt and llms.txt, one above the other in the project table's first column: the
 * footer is desktop-only, where the table's columns are fixed (see `space.projectColumns`).
 */
export function Metadata({ style }: { style?: Style }) {
  return (
    <footer {...stylex.props(style)}>
      <nav {...stylex.props(ui.text, styles.metadata)} aria-label="Metadata">
        <a
          {...stylex.props(ui.quiet, ui.respond, ui.focusRing, styles.link, styles.file)}
          href="https://github.com/gildrb/gildrb.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          src
        </a>
        {[
          { href: "/humans.txt", label: "humans.txt", rel: "author", type: "text/plain" },
          { href: "/llms.txt", label: "llms.txt", rel: "alternate", type: "text/markdown" },
        ].map(({ href, label, rel, type }) => (
          <a
            {...stylex.props(ui.quiet, ui.respond, ui.focusRing, styles.link, styles.file)}
            href={href}
            rel={rel}
            type={type}
          >
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}

/**
 * The phone page's side margin, half a line; the sticky name bar bleeds across it to the
 * viewport edge.
 */
const phoneGutter = `calc(${space.sectionGap} / 2)`;

const styles = stylex.create({
  // The background lives on <html> too, so the held first frame is already the theme color.
  html: {
    scrollbarGutter: { default: null, [media.desktop]: "stable" },
    backgroundColor: colors.bg,
    colorScheme: colors.scheme,
  },
  /**
   * The homepage fits the viewport; only the project list scrolls. On phones it always does; on
   * desktop the content fits until `data-dense` (see `align.ts`) holds it to the viewport.
   * Clipping covers heights too short for even its compact sidebar, so a scrollbar never appears.
   */
  fixedViewport: { height: "100dvh", overflow: "hidden" },
  /**
   * The homepage never scrolls, so the gutter that keeps it as wide as the scrolling pages is on
   * <body>, under its own background, not on the root. The browser paints an empty root gutter
   * apart from the page, and it can lag a theme change: a black or white strip flickers at the
   * window's edge.
   */
  homeRoot: { scrollbarGutter: "auto" },
  body: {
    // Held hidden by the font gate until Inter is ready; see `fontGate`.
    visibility: "var(--first-paint, visible)",
    backgroundColor: colors.bg,
    color: colors.primary,
    fontFeatureSettings: fontFeatures.interface,
    fontWeight: typeScale.textWeight,
    // Every element sets its own size; this keeps stray whitespace from adding height.
    fontSize: "1px",
    lineHeight: 1.5,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    WebkitTextSizeAdjust: "100%",
    textRendering: "optimizeLegibility",
  },
  homeBody: {
    minHeight: "100dvh",
    scrollbarGutter: { default: null, [media.desktop]: "stable" },
  },
  caseBody: { minHeight: "100vh" },
  wrapper: {
    // A minimum margin: the layout keeps its full width until the viewport cannot fit it. Four
    // units, a sidebar pitch.
    paddingInline: { default: `calc(4 * ${space.unit})`, [media.mobile]: phoneGutter },
  },
  /** Desktop: sidebar and content, one block centred in the wrapper at every width. */
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
      [media.mobile]: "auto auto auto minmax(0, 1fr)",
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
  /** Case pages' text: `ui.text`, so it follows the reader's font size from tablets up. */
  caseContent: { minHeight: "100vh" },
  homeToggle: {
    gridRow: { default: null, [media.mobile]: 1 },
    // Dense: centered over the table's arrows, whose column ends at the layout's right edge.
    right: {
      default: null,
      [stylex.when.ancestor("[data-dense]", rootMarker)]: {
        [media.desktop]: `calc((${space.toggleAxis} - ${space.toggleSize}) / 2)`,
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
    // iOS Safari tints its top bar from a fixed or sticky element at least 90% of the viewport
    // wide, then keeps that color after any tap, so the bar would hold the old theme until a
    // reload. The bar is therefore only as wide as its text; the full-bleed fade is `::before`,
    // which Safari does not sample, and the top bar follows the page background instead.
    width: { default: null, [media.mobile]: "fit-content" },
    maxWidth: { default: null, [media.mobile]: "100%" },
    padding: { default: null, [media.mobile]: `${space.sectionGap} 0 ${space.unit}` },
    "::before": {
      content: { default: null, [media.mobile]: '""' },
      position: "absolute",
      zIndex: -1,
      top: 0,
      bottom: 0,
      left: `calc(${phoneGutter} * -1)`,
      width: "100vw",
      backgroundImage: `linear-gradient(to bottom, ${colors.bg} 60%, transparent)`,
    },
  },
  homeName: {
    minHeight: {
      default: null,
      [media.desktop]: "var(--desktop-intro-height, 0px)",
      [media.mobile]: 0,
    },
    gridRow: 1,
    alignSelf: "start",
  },
  /**
   * Phones: laid over the homepage name, so a tap on the name shows or hides Contact and Links
   * (`links.ts`). Desktop keeps them in the sidebar and has no such button.
   */
  linksToggle: {
    display: { default: "none", [media.mobile]: "block" },
    position: "absolute",
    inset: 0,
  },
  caseName: {
    display: "flex",
    flexDirection: "column",
    alignItems: "start",
    whiteSpace: "nowrap",
    minHeight: {
      default: null,
      [media.desktop]: `var(--desktop-intro-height, calc(${space.linkLineHeight} * 2 + ${space.sectionContentGap}))`,
      [media.mobile]: 0,
    },
  },
  /**
   * The parent: the same name, in the same type and place as on the homepage, so only its color
   * changes between pages. Gray until hovered or focused; the page under it is in full contrast.
   */
  home: {
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
    },
    textDecoration: "none",
  },
  current: { color: colors.primary, textDecoration: "none" },
  desktopOnly: { display: { default: "contents", [media.mobile]: "none" } },
  phoneOnly: { display: { default: "none", [media.mobile]: "contents" } },
  links: {
    display: "flex",
    flexDirection: "column",
    rowGap: space.linkGap,
    gridColumn: { default: null, [media.mobile]: "1 / -1" },
  },
  /** Phones: hidden until the name is tapped (`links.ts`), then right under it, above About. */
  homeLinks: {
    display: {
      default: "flex",
      [media.mobile]: "none",
      [stylex.when.ancestor("[data-links-open]", rootMarker)]: { [media.mobile]: "flex" },
    },
    gridRow: 2,
    alignSelf: { default: null, [media.desktop]: "start" },
    marginBottom: { default: null, [media.mobile]: space.sectionGap },
  },
  caseLinks: {
    order: { default: null, [media.mobile]: 6 },
    marginTop: { default: null, [media.mobile]: space.sectionGap },
  },
  label: { width: "fit-content" },
  profileLabel: {
    // Phones: one section gap between the two lists, as between About and the table.
    marginTop: {
      default: null,
      [media.desktop]: space.sidebarBaselinePitch,
      [media.mobile]: `calc(${space.sectionGap} - ${space.linkGap})`,
    },
  },
  /** The project table's columns, so the links line up with its Project column. */
  metadata: {
    display: "grid",
    gridTemplateColumns: space.projectColumns,
    columnGap: space.tableGap,
    rowGap: space.linkGap,
    alignItems: "baseline",
    // Centers the last line on the theme toggle beside it.
    paddingBottom: `calc((${space.toggleSize} - ${space.linkLineHeight}) / 2)`,
  },
  file: { gridColumn: 1, justifySelf: "start" },
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
  contactLabel: {
    marginTop: {
      default: `calc(${space.sectionGap} - ${space.sectionContentGap})`,
      [media.desktop]: 0,
      [media.mobile]: 0,
    },
  },
});
