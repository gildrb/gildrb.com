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
  /** The homepage About text. `summary` stays the description in metadata, feeds and llms.txt. */
  about: "Based in Germany.",
} as const;

export type Link = { label: string; href: string };

export const profiles: readonly Link[] = [
  { label: "Are.na", href: "https://www.are.na/gil-rodrigues-tat8yjcamq4" },
  { label: "GitHub", href: "https://github.com/gildrb" },
  { label: "Goodreads", href: "https://www.goodreads.com/user/show/179740227-gil-rodrigues" },
  { label: "Letterboxd", href: "https://letterboxd.com/gildrb/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/gildrb/" },
];

export const contacts: readonly Link[] = [
  {
    label: "Signal",
    href: "https://signal.me/#eu/KlFnTOEoXJTxUNhl9y4U4-QzunoZj6eX2BrkGYibTNUmKw8OszhNgaKd-aoseeUZ",
  },
  { label: "X", href: "https://x.com/gildrb_" },
];

type Row = {
  date: string;
  title: string;
  /** What the client or product is, in at most four words: the table's Subject column. */
  descriptor: string;
  /** One sentence; homepage and "View next" rows carry it as the link's description. */
  description: string;
  /** Where the work lives or was posted: the page's Links list. */
  links: readonly Link[];
};

export type Case = Row & {
  slug: string;
  /** Breadcrumb name. */
  name: string;
  /** Tab and link-preview title: what the work is, in search words; the breadcrumb stays `name`. */
  headline: string;
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
    headline: "Local Studio: brand and website for private AI on your Mac",
    descriptor: "On-device AI for Mac",
    links: [{ label: "Site", href: "https://localstudio.gildrb.com/" }],
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
    headline: "T3: a self-initiated logomark exploration by Gil Rodrigues",
    descriptor: "Coding agent client",
    links: [{ label: "X", href: "https://x.com/gildrb_/status/2080990301208952994" }],
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
    headline: "Ben Davis: a db monogram and the davis7.sh website",
    descriptor: "Developer and YouTuber",
    links: [
      { label: "Site", href: "https://davis7.gildrb.com/" },
      { label: "Ben Davis", href: "https://x.com/davis7" },
      { label: "X", href: "https://x.com/gildrb_/status/2074468837781639301" },
    ],
    description:
      "A db monogram Gil Rodrigues drew for developer Ben Davis, and the davis7.sh site designed and built around it.",
    ogDescription:
      "A db monogram built from mirrored letterforms and one central diagonal, and the davis7.sh site around it.",
    ogImage: "gil-rodrigues-ben-davis-construction-1280.webp",
  },
  {
    slug: "heph",
    date: "2026-04-21",
    title: "Heph",
    name: "Heph",
    headline: "Heph: answers from your files, with every quote checked",
    descriptor: "Local document agent",
    links: [{ label: "Source", href: "https://github.com/gildrb/heph-agent" }],
    description:
      "Heph answers questions from the files in a folder and checks every quote that it cites against the source.",
    ogDescription: "Ask the files in a folder a question. Every quote in the answer is checked.",
    ogImage: "gil-rodrigues-heph-answer-1600.webp",
  },
  {
    slug: "filen",
    date: "2026-01-14",
    title: "Filen",
    name: "Filen",
    headline: "Filen: a self-initiated identity concept by Gil Rodrigues",
    descriptor: "Encrypted cloud storage",
    links: [{ label: "X", href: "https://x.com/gildrb_/status/2021242178727452998" }],
    description:
      "How Gil Rodrigues developed a self-initiated identity concept for Filen, from rejected marks to an app icon and campaign system.",
    ogDescription:
      "A self-initiated Filen identity concept developed through sketches, scale tests, an app icon, and privacy-focused campaign work.",
    ogImage: "gil-rodrigues-filen-wordmark-1600.webp",
  },
  {
    slug: "n0thing",
    date: "2019-11-15",
    title: "Jordan Gilbert",
    name: "Jordan Gilbert",
    headline: "Jordan Gilbert: a pixel wordmark for n0thing",
    descriptor: "Counter-Strike player",
    links: [{ label: "n0thing", href: "https://www.n0thing.gg/" }],
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
    headline: "CURVES: a free geometric display typeface by Gil Rodrigues",
    descriptor: "Geometric display typeface",
    links: [
      { label: "DaFont", href: "https://www.dafont.com/curves.font" },
      { label: "Behance", href: "https://www.behance.net/gallery/75409663/CURVES-Free-Font" },
    ],
    description:
      "CURVES is a free display typeface Gil Rodrigues designed in 2019, built from geometric forms and released as a 96-glyph unicase font.",
    ogDescription:
      "A 96-glyph unicase display typeface built from geometric forms and released for free.",
    ogImage: "gil-rodrigues-curves-letterforms-1280.webp",
  },
  {
    slug: "ml7",
    date: "2018-11-13",
    title: "Mihai Lupascu",
    name: "Mihai Lupascu",
    headline: "Mihai Lupascu: a compact channel logo by Gil Rodrigues",
    descriptor: "Overwatch streamer",
    links: [{ label: "Twitch", href: "https://www.twitch.tv/ml7support" }],
    description: "How Gil Rodrigues designed the compact mL7 channel logo in 2018.",
    ogDescription:
      "A compact identity built from a custom black wordmark and an orange directional stroke.",
    ogImage: "gil-rodrigues-ml7-logo-system-1600.webp",
  },
];

/**
 * The work a case study is about, for its JSON-LD `about`. `date` is when the work was made, so it
 * is the work's `dateCreated`, not the page's publication date.
 */
export function caseWork(item: Case) {
  return {
    "@type": "CreativeWork",
    name: item.title,
    dateCreated: item.date,
    genre: item.descriptor,
    creator: { "@id": `${origin}/#person` },
  } as const;
}

/** Software I make. Each has its own host; `gildrb.com/<slug>` redirects there. */
export type Product = Row & {
  slug: string;
  name: string;
  /** The origin the page lives on; its canonical URL is this origin's root. */
  home: `https://${string}`;
  /** Hosts that redirect to `home`, keeping the path. */
  aliases: readonly string[];
  /** Tab and search title: what it does, in the words people search for. */
  headline: string;
  repository: `https://github.com/${string}`;
  /** schema.org `applicationCategory`. */
  category: "DeveloperApplication" | "DesignApplication";
  operatingSystem: string;
  /** Archetypon also runs on its page; the others only describe themselves. */
  converter: boolean;
  /**
   * A `curl … | sh` installer behind the home host: `/install` always, and `/` for clients that
   * do not ask for HTML.
   */
  installer: { $: "None" } | { $: "Script"; url: `https://${string}` };
};

export const products: readonly Product[] = [
  {
    slug: "eukhe",
    date: "2026-10-05",
    title: "Eukhe",
    name: "Eukhe",
    descriptor: "Coding agent",
    links: [{ label: "Source", href: "https://github.com/gildrb/eukhe" }],
    home: "https://eukhe.com",
    aliases: ["eukhe.gildrb.com", "www.eukhe.com"],
    headline: "Eukhe: a coding agent that remembers every chat",
    description:
      "A coding agent and gateway with one endless chat as its memory, so it never loses the context of your work.",
    repository: "https://github.com/gildrb/eukhe",
    category: "DeveloperApplication",
    operatingSystem: "macOS (Apple Silicon), Linux",
    converter: false,
    installer: {
      $: "Script",
      url: "https://github.com/gildrb/eukhe/releases/latest/download/install.sh",
    },
  },
  {
    slug: "archetypon",
    date: "2026-09-26",
    title: "Archetypon",
    name: "Archetypon",
    descriptor: "SVG asset converter",
    links: [{ label: "Source", href: "https://github.com/gildrb/archetypon" }],
    home: "https://archetypon.gildrb.com",
    aliases: [],
    headline: "Archetypon: convert SVG to PNG, ICO, WebP, JPEG and PDF in your browser",
    description:
      "Turn SVG files into optimized SVG, PDF, PNG, WebP, JPEG and ICO assets, in your browser.",
    repository: "https://github.com/gildrb/archetypon",
    category: "DesignApplication",
    operatingSystem: "Any",
    converter: true,
    installer: { $: "None" },
  },
  {
    slug: "poros",
    date: "2026-09-02",
    title: "Poros",
    name: "Poros",
    descriptor: "Remote dev servers",
    links: [{ label: "Source", href: "https://github.com/gildrb/poros" }],
    home: "https://poros.gildrb.com",
    aliases: [],
    headline: "Poros: open your server's dev server on your Mac or phone over Tailscale",
    description:
      "Develop on a server and open the dev server on your Mac, phone or tablet: one command gives it a private HTTPS link on your tailnet.",
    repository: "https://github.com/gildrb/poros",
    category: "DeveloperApplication",
    operatingSystem: "macOS, Linux",
    converter: false,
    installer: {
      $: "Script",
      url: "https://raw.githubusercontent.com/gildrb/poros/main/install.sh",
    },
  },
];

/** Projects that live elsewhere: their rows link out instead of to a case study. */
const externals: readonly External[] = [];

/**
 * `external`: the row leaves Gil's own pages (underlined title, no arrow). Products live on
 * their own hosts but are his pages too, so they read as subpages (→).
 */
export type Project = Row & { href: string; external: boolean };

/** Homepage rows, newest first. */
export const projects: readonly Project[] = [
  ...cases.map((item) => ({ ...item, href: `/${item.slug}`, external: false })),
  ...products.map((item) => ({ ...item, href: `${item.home}/`, external: false })),
  ...externals.map((item) => ({ ...item, external: true })),
].toSorted((left, right) => right.date.localeCompare(left.date));

export const slugs = cases.map((item) => item.slug);

/** Where people and agents find the API, MCP server and Markdown access. */
export const developers = {
  slug: "developers",
  name: "Developers",
  description: "Public read-only API, MCP server and Markdown access for gildrb.com.",
} as const;

/** Plain pages written in `src/content/<slug>.md`; `kind` is their schema.org page type. */
export const pages = [
  {
    slug: "about",
    name: "About",
    kind: "AboutPage",
    description: "About Gil Rodrigues (gildrb), a designer based in Germany.",
  },
  {
    slug: "contact",
    name: "Contact",
    kind: "ContactPage",
    description: "How to contact Gil Rodrigues (gildrb): email, Signal or X.",
  },
  {
    slug: "privacy",
    name: "Privacy",
    kind: "WebPage",
    description: "Privacy statement for gildrb.com: no cookies, analytics or tracking scripts.",
  },
  { ...developers, kind: "WebPage" },
] as const;

export type SortKey = "date" | "title";
export type SortDirection = "ascending" | "descending";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Dates sort chronologically, newest first when "descending"; text sorts A–Z when "descending". */
export function compareRows(key: SortKey, direction: SortDirection) {
  const factor = (key === "date") === (direction === "descending") ? -1 : 1;
  return (left: Record<SortKey, string>, right: Record<SortKey, string>): number =>
    factor *
    (key === "date"
      ? left.date.localeCompare(right.date)
      : collator.compare(left[key], right[key]));
}
