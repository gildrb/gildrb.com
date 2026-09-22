import { informationSlugs } from "../src/content/pages";
import { caseProjects } from "../src/content/projects";
import {
  API_HEADERS,
  NOT_FOUND_MARKDOWN,
  withHeaders,
  type RequestContext,
} from "../src/server/http";
const markdownRepresentations = new Map<string, string>([
  ["/", "/index.html.md"],
  ["/all", "/llms-full.txt"],
  ...caseProjects.map(
    (project) => [project.href, `/content/${project.slug}.md`] as [string, string],
  ),
  ...informationSlugs.map((slug) => [`/${slug}`, `/content/${slug}.md`] as [string, string]),
]);
const staticAliases = new Map([
  ["/api/profile", "/profile.json"],
  ["/api/v1/profile", "/profile.json"],
  ["/mcp/server-card", "/.well-known/mcp/server-card.json"],
  ["/.well-known/mcp", "/.well-known/mcp.json"],
]);

const DEPRECATED_ALIAS_HEADERS = {
  Deprecation: "version=v1",
  Sunset: "Sun, 01 Aug 2027 00:00:00 GMT",
  "Sunset-Context":
    "Unversioned alias of /api/v1/profile; prefer the versioned path. Policy: https://gildrb.com/api-docs.md#versioning",
};

export async function onRequest({ env, request }: RequestContext) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return Response.json({ error: "Invalid request URL" }, { status: 400 });
  }
  if (url.hostname === "www.gildrb.com") {
    url.hostname = "gildrb.com";
    return Response.redirect(url, 301);
  }
  const pathname = url.pathname;
  const acceptsMarkdown = request.headers.get("Accept")?.toLowerCase().includes("text/markdown");
  const markdownPath = markdownRepresentations.get(pathname);
  const targetPath =
    acceptsMarkdown && markdownPath ? markdownPath : (staticAliases.get(pathname) ?? pathname);
  url.pathname = targetPath;
  url.search = "";
  const targetUrl = url;
  const response = await env.ASSETS.fetch(
    new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
    }),
  );

  const isApiPath =
    pathname === "/api" ||
    pathname === "/api/v1" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/api/v1/");
  if (isApiPath && response.status === 404) {
    return withHeaders(
      new Response(
        `${JSON.stringify(
          {
            type: "https://gildrb.com/api-docs.md#errors",
            title: "Not Found",
            status: 404,
            detail:
              "Unknown API resource. See https://gildrb.com/api-docs.md for available endpoints.",
            instance: pathname,
          },
          null,
          2,
        )}\n`,
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/problem+json; charset=utf-8",
          },
        },
      ),
      API_HEADERS,
    );
  }

  if (acceptsMarkdown && markdownPath) {
    return withHeaders(response, {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
    });
  }
  if (response.status === 404 && acceptsMarkdown && !isApiPath && request.method !== "HEAD") {
    return new Response(NOT_FOUND_MARKDOWN, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (pathname === "/api/profile") {
    return withHeaders(response, {
      ...API_HEADERS,
      ...DEPRECATED_ALIAS_HEADERS,
      "Content-Type": "application/ld+json; charset=utf-8",
    });
  }
  if (pathname === "/api/v1/profile") {
    return withHeaders(response, {
      ...API_HEADERS,
      "Content-Type": "application/ld+json; charset=utf-8",
    });
  }
  if (pathname === "/mcp/server-card") {
    return withHeaders(response, {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/mcp-server-card+json; charset=utf-8",
    });
  }
  return response;
}
