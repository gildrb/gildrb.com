import * as stylex from "@stylexjs/stylex";
import type { ComponentChildren } from "preact";
import { entry, fontGate, timing } from "./entry.ts";
import { Island } from "./island.tsx";
import { Email } from "./islands/email.tsx";
import { ThemeToggle } from "./islands/theme.tsx";
import { align } from "./align.ts";
import { contacts, type Link, person, profiles } from "./site.ts";
import { themeScript } from "./theme.ts";
import { colors, denseMarker, media, space } from "./tokens.stylex.ts";
import { type Style, ui } from "./ui.tsx";

export type Assets = { script: string; css: string };

// Both faces are subset to exactly this range (see README), so declare it to the browser.
const fontRanges =
  "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2010-205E,U+20AC,U+2122,U+2190-21FF,U+2212,U+2500-257F";

/** The few rules StyleX cannot attach to an element, layered beneath StyleX's own layers. */
const globalCss = [
  "@layer reset;",
  `@font-face{font-family:"Inter";font-weight:380 600;font-display:swap;src:url("/fonts/inter.woff2") format("woff2");unicode-range:${fontRanges}}`,
  `@font-face{font-family:"Ioskeley Mono";font-weight:400;font-display:optional;src:url("/fonts/ioskeley-mono.woff2") format("woff2");unicode-range:${fontRanges}}`,
  // Arial (or metric-identical Liberation Sans) scaled to Inter's metrics, so text laid out
  // before the web font arrives does not move when it does.
  '@font-face{font-family:"Inter Fallback";src:local("Arial"),local("Liberation Sans");size-adjust:107.35%;ascent-override:90.24%;descent-override:22.47%;line-gap-override:0%}',
  "@layer reset{*{margin:0;padding:0;box-sizing:border-box}}",
  `::selection{color:${colors.bg};background:${colors.primary}}`,
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
    <html lang="en" {...stylex.props(denseMarker, styles.html, home && styles.fixedViewport)}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Hold the first paint until the whole page is parsed and aligned, so it never arrives
            in pieces or shifts. Preact's typings lack `blocking` on <link>, hence the spread. */}
        <link rel="expect" href="#aligned" {...{ blocking: "render" }} />
        {head}
        <title>{title}</title>
        <link id="favicon" rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script data-cfasync="false" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          rel="preload"
          href="/fonts/inter.woff2"
          as="font"
          type="font/woff2"
          crossorigin="anonymous"
        />
        {mono && (
          <link
            rel="preload"
            href="/fonts/ioskeley-mono.woff2"
            as="font"
            type="font/woff2"
            crossorigin="anonymous"
          />
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
      {children}
    </main>
  );
}

/** Site name, or on inner pages a breadcrumb back to it. */
export function Name({ current }: { current?: string }) {
  return current ? (
    <p {...stylex.props(styles.name, styles.caseName)}>
      <a {...stylex.props(ui.focusRing, styles.home)} href="/">
        Gil Rodrigues
      </a>
      <span {...stylex.props(styles.arrow)} aria-hidden="true">
        →
      </span>
      <a {...stylex.props(ui.focusRing, styles.current)} href="#top">
        {current}
      </a>
    </p>
  ) : (
    <h1 {...stylex.props(styles.name, styles.homeName)} id="site-title" itemprop="name">
      <span data-nosnippet>Gil Rodrigues</span>
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
 * Profile and contact links. On phones they form two columns; `client.ts` aligns the second
 * with the table's scope column through `--mobile-contact-start`.
 */
export function Links({ home = false, phone = false }: { home?: boolean; phone?: boolean }) {
  const rise = home && entry.rise;
  const stagger = (index: number) => ({
    "--entry-delay": `${timing.link.desktop[index]}ms`,
    "--entry-delay-mobile": `${timing.link.phone[index]}ms`,
  });
  const link = (item: Link, index: number, placement: Style, me: boolean) => {
    return (
      <a
        {...stylex.props(ui.quiet, ui.focusRing, styles.link, placement, rise)}
        style={home ? stagger(index) : undefined}
        href={item.href}
        target="_blank"
        rel={me ? "me noopener noreferrer" : "noopener noreferrer"}
        itemprop={me ? "sameAs" : undefined}
        data-guardrail={item.label === "Letterboxd" || undefined}
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
      <p
        {...stylex.props(styles.label, styles.profileLabel, rise)}
        style={home ? stagger(0) : undefined}
      >
        <span data-nosnippet>Links</span>
      </p>
      {profiles.map((item, index) => link(item, index + 1, styles.profile, true))}
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

const styles = stylex.create({
  // The background lives on <html> too, so the held first frame is already the theme color.
  html: {
    scrollbarGutter: { default: null, [media.desktop]: "stable" },
    backgroundColor: colors.bg,
  },
  /** The phone homepage fits the viewport; only the project list scrolls. */
  fixedViewport: {
    height: { default: null, [media.mobile]: "100dvh" },
    minHeight: { default: null, [media.mobile]: "100dvh" },
    overflow: { default: null, [media.mobile]: "hidden" },
  },
  body: {
    // Held hidden by the font gate until Inter is ready; see `fontGate`.
    visibility: "var(--first-paint, visible)",
    backgroundColor: colors.bg,
    color: colors.primary,
    fontFamily:
      'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFeatureSettings: '"liga" 1, "calt" 1',
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
    paddingInline: {
      default: "48px",
      "@media (max-width: 1400px)": "32px",
      [media.mobile]: "12px",
    },
  },
  layout: {
    display: "grid",
    gridTemplateColumns: {
      default: `${space.sidebarColumn} 1fr`,
      [media.mobile]: "minmax(0, 1fr) 32px",
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
      [stylex.when.ancestor("[data-dense]", denseMarker)]: { [media.desktop]: "auto 1fr auto" },
    },
    rowGap: 0,
    paddingBlock: { default: null, [media.desktop]: "48px" },
    height: {
      default: null,
      [media.mobile]: "100dvh",
      [stylex.when.ancestor("[data-dense]", denseMarker)]: { [media.desktop]: "100dvh" },
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
    padding: { default: "48px 0", [media.mobile]: 0 },
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
    padding: { default: "48px 0", [media.mobile]: 0 },
    display: { default: "flex", [media.mobile]: "contents" },
    flexDirection: "column",
  },
  homeContent: { gridColumn: { default: null, [media.desktop]: 2 } },
  caseContent: { minHeight: "100vh", fontSize: "16px", lineHeight: "26px" },
  homeToggle: {
    gridRow: { default: null, [media.mobile]: 1 },
    // Dense: centered over the table's arrows, whose column ends at the layout's right edge.
    right: {
      default: null,
      [stylex.when.ancestor("[data-dense]", denseMarker)]: {
        [media.desktop]: `calc((${space.arrowWidth} - ${space.toggleSize}) / 2)`,
      },
    },
  },
  name: {
    fontSize: "19px",
    fontWeight: 400,
    lineHeight: space.linkLineHeight,
    letterSpacing: "-0.02em",
    color: colors.primary,
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
    width: { default: null, [media.mobile]: "calc(100% + 56px)" },
    marginLeft: { default: null, [media.mobile]: "-12px" },
    padding: { default: null, [media.mobile]: "24px 44px 8px 12px" },
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
    rowGap: {
      default: `calc(${space.sidebarBaselinePitch} - ${space.linkLineHeight})`,
      [media.mobile]: space.sectionContentGap,
    },
    gridTemplateColumns: {
      default: null,
      [media.mobile]: "var(--mobile-contact-start, max-content) minmax(0, 1fr)",
    },
    columnGap: {
      default: null,
      [media.mobile]: `calc(${space.mobileCellEndSpace} + ${space.mobileTableGap})`,
    },
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
  profileLabel: { marginTop: { default: null, [media.desktop]: space.sidebarBaselinePitch } },
  link: {
    paddingBlock: `calc(${space.sectionContentGap} / 2)`,
    marginBlock: `calc(${space.sectionContentGap} / -2)`,
    "::after": {
      content: '" ↗"',
      fontFamily:
        'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  },
  profile: {
    gridColumn: { default: null, [media.mobile]: 1 },
    justifySelf: "start",
    width: { default: "fit-content", [media.mobile]: "max-content" },
  },
  contact: {
    order: { default: null, [media.desktop]: -1 },
    gridColumn: { default: null, [media.mobile]: 2 },
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
