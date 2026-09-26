export const origin = "https://gildrb.com";
export const email = "mail@gildrb.com";

/**
 * Who this site is about. Keep it to facts that stay true: every page, feed and identity
 * file (profile.json, llms.txt, humans.txt, WebFinger) is generated from it.
 */
export const person = {
  name: "Gil Rodrigues",
  givenName: "Gil",
  additionalName: "Domingos",
  familyName: "Rodrigues Barbosa",
  handle: "gildrb",
  alternateNames: ["Gil", "gildrb", "Gil Rodrigues Barbosa", "Gil Domingos Rodrigues Barbosa"],
  role: "Designer",
  summary: "Designer based in Germany.",
} as const;

export type Link = { label: string; href: string };

export const profiles: readonly Link[] = [
  { label: "Bēhance", href: "https://behance.net/gildrb" },
  { label: "GitHub", href: "https://github.com/gildrb" },
  { label: "Letterboxd", href: "https://letterboxd.com/gildrb/" },
  { label: "Literal", href: "https://literal.club/gildrb" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/gildrb/" },
];

export const contacts: readonly Link[] = [
  {
    label: "Signal",
    href: "https://signal.me/#eu/KlFnTOEoXJTxUNhl9y4U4-QzunoZj6eX2BrkGYibTNUmKw8OszhNgaKd-aoseeUZ",
  },
  { label: "X", href: "https://x.com/gildrb_" },
];

type Row = { date: string; title: string; scope: string };

export type Case = Row & {
  slug: string;
  /** Breadcrumb and document title. */
  name: string;
  description: string;
  ogDescription: string;
  /** Social preview image, relative to `/images/optimized/`. */
  ogImage?: string;
};

type External = Row & { href: string };

export const cases: readonly Case[] = [
  {
    slug: "local-studio",
    date: "2026-08-26",
    title: "Local Studio",
    name: "Local Studio",
    scope: "Brand Design/Design Engineering",
    description:
      "The brand and website Gil Rodrigues designed and built for Local Studio, private AI that runs on your Mac.",
    ogDescription: "Brand and website for Local Studio, private AI that runs on your Mac.",
    ogImage: "gil-rodrigues-local-studio-tour-960.webp",
  },
  {
    slug: "t3",
    date: "2026-07-25",
    title: "T3",
    name: "T3",
    scope: "Logo",
    description:
      "A self-initiated T3 logomark exploration built across products, icons, and a family of rejected directions.",
    ogDescription:
      "A self-initiated T3 logomark exploration developed across products, icons, and a family of rejected directions.",
    ogImage: "gil-rodrigues-t3-mark-1200.webp",
  },
  {
    slug: "ben-davis",
    date: "2026-07-07",
    title: "Ben Davis",
    name: "Ben Davis",
    scope: "Design Engineering/Logo",
    description:
      "A db monogram Gil Rodrigues drew for developer Ben Davis, and the davis7.sh site designed and built around it.",
    ogDescription:
      "A db monogram built from mirrored letterforms and one central diagonal, and the davis7.sh site around it.",
    ogImage: "gil-rodrigues-ben-davis-construction-1280.webp",
  },
  {
    slug: "heph",
    date: "2026-04-21",
    title: "Heph-Agent",
    name: "Heph",
    scope: "Product/Design Engineering",
    description:
      "Heph answers questions from your own files and shows where each answer came from.",
    ogDescription: "Ask your own files a question and see the passages behind the answer.",
  },
  {
    slug: "filen",
    date: "2026-01-14",
    title: "Filen",
    name: "Filen",
    scope: "Brand Design",
    description:
      "How Gil Rodrigues developed a self-initiated identity concept for Filen, from rejected marks to an app icon and campaign system.",
    ogDescription:
      "A self-initiated Filen identity concept developed through sketches, scale tests, an app icon, and privacy-focused campaign work.",
    ogImage: "gil-rodrigues-filen-wordmark-1600.webp",
  },
  {
    slug: "n0thing",
    date: "2019-11-15",
    title: "n0thing",
    name: "n0thing",
    scope: "Logo",
    description:
      "How Gil Rodrigues developed Jordan “n0thing” Gilbert's commissioned pixel wordmark through a rejected typewriter study, final exports, and motion.",
    ogDescription:
      "From an early pixel mark and typewriter exploration to final exports and an animated wordmark.",
    ogImage: "gil-rodrigues-n0thing-wordmark-animation-1280.gif",
  },
  {
    slug: "curves",
    date: "2019-01-25",
    title: "CURVES",
    name: "CURVES",
    scope: "Typeface",
    description:
      "CURVES is a free display typeface Gil Rodrigues designed in 2019, built from geometric forms and released as a 96-glyph unicase font.",
    ogDescription:
      "A 96-glyph unicase display typeface built from geometric forms and released for free.",
    ogImage: "gil-rodrigues-curves-letterforms-1280.webp",
  },
  {
    slug: "ml7",
    date: "2018-11-13",
    title: "mL7",
    name: "mL7",
    scope: "Logo",
    description: "How Gil Rodrigues designed the compact mL7 channel logo in 2018.",
    ogDescription:
      "A compact identity built from a custom black wordmark and an orange directional stroke.",
    ogImage: "gil-rodrigues-ml7-logo-system-1600.webp",
  },
];

/** Tools that run on the site itself: their rows open the tool, not a case study. */
export type Tool = Row & { slug: string; name: string; description: string };

export const tools: readonly Tool[] = [
  {
    slug: "archetypon",
    date: "2026-09-26",
    title: "Archetypon",
    name: "Archetypon",
    scope: "Tool",
    description:
      "Turn SVG files into optimized SVG, PDF, PNG, WebP, JPEG and ICO assets, in your browser.",
  },
];

/** Projects that live elsewhere: their rows link out instead of to a case study. */
const externals: readonly External[] = [];

export type Project = Row & { href: string; external: boolean };

/** Homepage rows, newest first. */
export const projects: readonly Project[] = [
  ...cases.map((item) => ({ ...item, href: `/${item.slug}`, external: false })),
  ...tools.map((item) => ({ ...item, href: `/${item.slug}`, external: false })),
  ...externals.map((item) => ({ ...item, external: true })),
].sort((left, right) => right.date.localeCompare(left.date));

export const slugs = cases.map((item) => item.slug);

/** Where people and agents find the API, MCP server and Markdown access. */
export const developers = {
  slug: "developers",
  name: "Developers",
  description: "Public read-only API, MCP server and Markdown access for gildrb.com.",
} as const;

/** Plain pages written in `src/content/<slug>.md`. */
export const pages = [
  {
    slug: "about",
    name: "About",
    description: "About Gil Rodrigues (gildrb), a designer based in Germany.",
  },
  { slug: "contact", name: "Contact", description: "How to contact Gil Rodrigues (gildrb)." },
  { slug: "privacy", name: "Privacy", description: "Privacy statement for gildrb.com." },
  developers,
] as const;

export type SortKey = "date" | "title" | "scope";
export type SortDirection = "ascending" | "descending";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Dates sort chronologically; text sorts A–Z when "descending", matching the header arrow. */
export function compareRows(key: SortKey, direction: SortDirection) {
  const factor = (key === "date") === (direction === "descending") ? -1 : 1;
  return (left: Row, right: Row): number =>
    factor *
    (key === "date"
      ? left.date.localeCompare(right.date)
      : collator.compare(left[key], right[key]) ||
        (key === "scope" ? collator.compare(left.title, right.title) : 0));
}
