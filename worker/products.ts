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
  // The page itself, and the files it loads (scripts, fonts, images, the converter's engine).
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (pathname === "/" || last.includes(".")) {
    const target = new URL(pathname === "/" ? `/${product.slug}` : pathname, upstream);
    target.search = url.search;
    return fetch(new Request(target, request));
  }
  // Every other path is a gildrb.com page: the breadcrumb, the nav and the "next" rows.
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
