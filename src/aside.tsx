import * as stylex from "@stylexjs/stylex";
import type { Heading } from "./markdown.tsx";
import type { Link } from "./site.ts";
import { colors, media, space } from "./tokens.stylex.ts";
import { type Style, ui } from "./ui.tsx";

/**
 * The page's parts, to jump to. `contents.ts` marks the part being read with the square in the
 * gutter beside the text; without JavaScript the list still links every part.
 */
function Contents({ parts }: { parts: readonly Heading[] }) {
  return (
    <nav {...stylex.props(styles.group)} aria-label="Contents" data-contents>
      <p {...stylex.props(styles.label)}>Contents</p>
      <div {...stylex.props(styles.track)}>
        <span {...stylex.props(styles.marker)} aria-hidden="true" data-contents-marker />
        <ol {...stylex.props(styles.list)}>
          {parts.map(({ id, text }) => (
            <li {...stylex.props(styles.item)}>
              <a {...stylex.props(ui.focusRing, styles.part)} href={`#${id}`}>
                {text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

/**
 * Where the work lives or was posted, set like the sidebar's lists. "Elsewhere", not "Links": on
 * phones it sits above the profile links, which already take that name.
 */
export function WorkLinks({ links, style }: { links: readonly Link[]; style?: Style }) {
  return (
    <nav {...stylex.props(ui.text, styles.group, style)} aria-label="Elsewhere">
      <p {...stylex.props(styles.label)}>Elsewhere</p>
      <ul {...stylex.props(styles.list)}>
        {links.map(({ label, href }) => (
          <li {...stylex.props(styles.item)}>
            <a
              {...stylex.props(ui.quiet, ui.focusRing, ui.outbound)}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Wide screens' third column on a project or plain page: its contents and its links, set like the
 * sidebar's lists and held in view while the text scrolls beside it.
 */
export function Aside({ parts, links }: { parts: readonly Heading[]; links: readonly Link[] }) {
  return (
    <aside {...stylex.props(ui.text, styles.aside)} aria-label="On this page">
      {parts.length > 0 && <Contents parts={parts} />}
      {links.length > 0 && <WorkLinks links={links} />}
    </aside>
  );
}

const styles = stylex.create({
  aside: {
    display: { default: "none", [media.wide]: "flex" },
    flexDirection: "column",
    rowGap: space.sidebarBaselinePitch,
    gridColumn: 3,
    gridRow: 1,
    alignSelf: "start",
    position: "sticky",
    top: 0,
    maxHeight: "100vh",
    overflowY: "auto",
    scrollbarWidth: "none",
    paddingBlock: space.pageInset,
    // Room for the marker in the gutter, which the scrolling box would otherwise clip.
    paddingLeft: "24px",
    marginLeft: "-24px",
    maxWidth: `${42 * 8 + 24}px`,
  },
  group: { display: "flex", flexDirection: "column", rowGap: space.linkGap },
  /** As the sidebar's "Contact" and "Links". */
  label: { color: colors.secondary },
  track: { position: "relative" },
  list: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    rowGap: space.linkGap,
    listStyleType: "none",
  },
  item: { display: "block" },
  /**
   * The square for the part being read, in the gutter between the text and this list: beside the
   * content it marks. `contents.ts` moves it.
   */
  marker: {
    position: "absolute",
    // Centered on a link's first line (24px); `contents.ts` moves it down to the link.
    top: "9px",
    left: "-20px",
    width: "6px",
    height: "6px",
    backgroundColor: colors.primary,
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
