import * as stylex from "@stylexjs/stylex";
import type { Heading } from "./markdown.tsx";
import type { Link } from "./site.ts";
import { colors, media, space } from "./tokens.stylex.ts";
import { type Style, ui } from "./ui.tsx";

/**
 * The page's parts, to jump to. `contents.ts` marks the part being read (`aria-current`), and its
 * link turns to full contrast: color is the indicator, as everywhere on the site. Without
 * JavaScript the list still links every part.
 */
function Contents({ parts }: { parts: readonly Heading[] }) {
  return (
    <nav {...stylex.props(styles.group)} aria-label="Contents" data-contents>
      <p {...stylex.props(ui.label)}>Contents</p>
      <ol {...stylex.props(styles.list)}>
        {parts.map(({ id, text }, index) => (
          <li {...stylex.props(styles.item)}>
            <a
              {...stylex.props(ui.focusRing, ui.respond, styles.link, styles.part)}
              href={`#${id}`}
              // A page opens on its first part: marked in the HTML, so it is lit from the first
              // paint, before `contents.ts` takes over.
              aria-current={index === 0 ? "location" : undefined}
            >
              {text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Where a link goes, as people read an address: no scheme, no `www.`, no trailing slash. */
function destination(href: string): string {
  const url = new URL(href);
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.hostname.replace(/^www\./, "")}${path}`;
}

/**
 * "Source" or "Sources", then the address each link goes to, so the parties involved (the code, a
 * site, posts) are named. The source code sits under the opening; other links end the page.
 */
export function SourcesLine({ links, style }: { links: readonly Link[]; style?: Style }) {
  return (
    <p {...stylex.props(ui.prose, styles.line, style)}>
      <span {...stylex.props(styles.label)}>{links.length === 1 ? "Source: " : "Sources: "}</span>
      {links.map(({ label, href }, index) => (
        <>
          {index > 0 && ", "}
          <a
            {...stylex.props(ui.focusRing, ui.outbound, ui.respond, styles.address)}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label}: ${destination(href)}`}
          >
            {destination(href)}
          </a>
        </>
      ))}
    </p>
  );
}

/**
 * Desktop: the page's contents in the sidebar, in place of the contact and profile links, set as
 * they are. Phones show neither.
 */
export function Aside({ parts }: { parts: readonly Heading[] }) {
  return (
    <div {...stylex.props(ui.text, styles.aside)}>
      <Contents parts={parts} />
    </div>
  );
}

const styles = stylex.create({
  aside: { display: { default: "contents", [media.mobile]: "none" } },
  group: { display: "flex", flexDirection: "column", rowGap: space.linkGap },
  /** As the sidebar's "Contact" and "Links". */
  label: { color: colors.secondary },
  /** The Sources line: running text, an address may break anywhere rather than overflow. */
  line: { margin: 0, color: colors.article, overflowWrap: "anywhere" },
  /** Set like the article links (`markdown.tsx`), with `ui.outbound`. */
  address: { color: { default: colors.article, ":focus-visible": colors.primary } },
  list: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    rowGap: space.linkGap,
    listStyleType: "none",
  },
  item: { display: "block" },
  /**
   * Each link pads into half the gap on both sides, so neighbouring hit areas meet with no dead
   * space between them, as in the sidebar's lists.
   */
  link: {
    display: "block",
    width: "fit-content",
    paddingBlock: `calc(${space.linkGap} / 2)`,
    marginBlock: `calc(${space.linkGap} / -2)`,
  },
  part: {
    display: "block",
    textDecoration: "none",
    color: {
      default: colors.tertiary,
      ":hover": { [media.hover]: colors.primary },
      ":focus-visible": colors.primary,
      ":is([aria-current])": colors.primary,
    },
  },
});
