import { origin, type Product, products } from "../src/site.ts";

/**
 * Serves each product page on its own host (`Product.home`). The pages are built and deployed with
 * gildrb.com; this Worker reads them from the Pages deployment's own host, where gildrb.com's
 * redirect of `/<slug>` (see `functions/[[path]].ts`) does not apply.
 */
const upstream = "https://web-2qb.pages.dev";

type Site = { $: "Home"; product: Product } | { $: "Alias"; home: string };

const sites = new Map<string, Site>(
  products.flatMap((product): [string, Site][] => [
    [new URL(product.home).hostname, { $: "Home", product }],
    ...product.aliases.map((alias): [string, Site] => [alias, { $: "Alias", home: product.home }]),
  ]),
);

const text = (body: string, type: string) =>
  new Response(body, {
    headers: { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "public, max-age=3600" },
  });

/** The product's own llms.txt; gildrb.com's describes the person, not this host. */
const llms = (product: Product) => `# ${product.name}

> ${product.description}

${product.name} is made by [Gil Rodrigues (gildrb)](${origin}/). Request ${product.home}/ with \`Accept: text/markdown\` for the whole page as Markdown.

## Links

- [${product.headline}](${product.home}/)
- [Source code](${product.repository})
${product.installer.$ === "Script" ? `- [Install script](${product.installer.url})\n` : ""}- [About the author](${origin}/llms.txt)
`;

/** Path prefixes of the files a product page loads; see `serve`. */
const pageFiles = [
  "/assets/",
  "/fonts/",
  "/images/",
  "/videos/",
  "/tools/",
  "/favicon.svg",
  "/preview-favicon.svg",
];

function serve(request: Request, url: URL, product: Product): Promise<Response> | Response {
  const { pathname } = url;
  const installer = product.installer;
  if (installer.$ === "Script") {
    // `curl … | sh` sends `Accept: */*`; a browser asks for HTML and an agent for Markdown, and
    // both get the page.
    const accept = request.headers.get("Accept") ?? "";
    const page = accept.includes("text/html") || accept.includes("text/markdown");
    if (pathname === "/install" || (pathname === "/" && !page))
      return new Response(null, {
        status: 302,
        headers: { Location: installer.url, Vary: "Accept" },
      });
  }
  if (pathname === "/robots.txt")
    return text(`User-agent: *\nAllow: /\n\nSitemap: ${product.home}/sitemap.xml\n`, "text/plain");
  if (pathname === "/sitemap.xml")
    return text(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${product.home}/</loc></url>\n</urlset>\n`,
      "application/xml",
    );
  if (pathname === "/llms.txt" || pathname === "/.well-known/llms.txt")
    return text(llms(product), "text/markdown");
  // The page itself, and the files it loads (scripts, fonts, images, the converter's engine).
  if (pathname === "/" || pageFiles.some((prefix) => pathname.startsWith(prefix))) {
    const target = new URL(pathname === "/" ? `/${product.slug}` : pathname, upstream);
    target.search = url.search;
    return fetch(new Request(target, request));
  }
  // Everything else is gildrb.com's: its pages (the breadcrumb, the nav and the "next" rows) and
  // its files (llms-full.txt, profile.json, …), which would otherwise be copies on this host.
  return Response.redirect(`${origin}${pathname}${url.search}`, 301);
}

export default {
  fetch(request) {
    const url = new URL(request.url);
    const site = sites.get(url.hostname);
    if (site === undefined) return new Response("Not Found", { status: 404 });
    switch (site.$) {
      case "Alias":
        return Response.redirect(`${site.home}${url.pathname}${url.search}`, 301);
      case "Home":
        return serve(request, url, site.product);
      default: {
        const _: never = site;
        return _;
      }
    }
  },
} satisfies ExportedHandler;
