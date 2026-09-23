/** Helpers shared by the Pages Functions; this module exports no handler, so it is not a route. */
export type Env = { ASSETS: Fetcher };

export const apiHeaders = {
  "RateLimit-Limit": "60",
  "RateLimit-Policy": "60;w=60",
  "X-API-Version": "v1",
};

/** An RFC 9457 problem response, pointing at the API documentation. */
export function problem(
  status: number,
  title: string,
  detail: string,
  init: { instance?: string; headers?: HeadersInit } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/problem+json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  const body = {
    type: "https://gildrb.com/api-docs.md#errors",
    title,
    status,
    detail,
    ...(init.instance && { instance: init.instance }),
  };
  return new Response(`${JSON.stringify(body, null, 2)}\n`, { status, headers });
}

export function wantsMarkdown(request: Request): boolean {
  return request.headers.get("Accept")?.toLowerCase().includes("text/markdown") ?? false;
}

export function markdownNotFound(): Response {
  return new Response(
    `# Not found

This path does not exist on gildrb.com. The response is a real HTTP 404.

## Where to look next

- [Homepage](https://gildrb.com/)
- [All projects](https://gildrb.com/all)
- [Sitemap](https://gildrb.com/sitemap.xml)
- [llms.txt](https://gildrb.com/llms.txt)
- [llms-full.txt](https://gildrb.com/llms-full.txt)
- [Developer resources](https://gildrb.com/developers)
`,
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

/** Redirects the `www` host to the apex, or returns nothing. */
export function canonicalHost(request: Request): Response | undefined {
  const url = new URL(request.url);
  if (url.hostname !== "www.gildrb.com") return undefined;
  url.hostname = "gildrb.com";
  return Response.redirect(url.href, 301);
}
