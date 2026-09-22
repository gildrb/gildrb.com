export interface Project {
  slug: string;
  title: string;
  date: string;
  scope: string;
  href: string;
  external: boolean;
}

export const projects: readonly Project[] = [
  {
    slug: "davis7",
    title: "davis7.sh",
    date: "2026-09-08",
    scope: "Design Engineering",
    href: "https://davis7-518d7u135-heph.vercel.app/",
    external: true,
  },
  {
    slug: "localstudio",
    title: "localstudio.ai",
    date: "2026-08-26",
    scope: "Design Engineering",
    href: "https://site-localstudio-co0dvice9-heph.vercel.app/",
    external: true,
  },
  {
    slug: "t3",
    title: "T3",
    date: "2026-07-25",
    scope: "Logo",
    href: "/t3",
    external: false,
  },
  {
    slug: "ben-davis",
    title: "Ben Davis",
    date: "2026-07-07",
    scope: "Logo",
    href: "/ben-davis",
    external: false,
  },
  {
    slug: "heph",
    title: "Heph-Agent",
    date: "2026-04-21",
    scope: "Product/Design Engineering",
    href: "/heph",
    external: false,
  },
  {
    slug: "filen",
    title: "Filen",
    date: "2026-01-14",
    scope: "Brand Design",
    href: "/filen",
    external: false,
  },
  {
    slug: "n0thing",
    title: "n0thing",
    date: "2019-11-15",
    scope: "Logo",
    href: "/n0thing",
    external: false,
  },
  {
    slug: "curves",
    title: "CURVES",
    date: "2019-01-25",
    scope: "Typeface",
    href: "/curves",
    external: false,
  },
  {
    slug: "ml7",
    title: "mL7",
    date: "2018-11-13",
    scope: "Logo",
    href: "/ml7",
    external: false,
  },
];

export const caseProjects = projects.filter((project) => !project.external);
