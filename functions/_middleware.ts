import { API_HEADERS, NOT_FOUND_MARKDOWN, type RequestContext } from "../src/server/http";
const blockedFiles = new Set([
  "/.gitignore",
  "/CLOUDFLARE.md",
  "/DNS-AID.md",
  "/LICENSE",
  "/README.md",
  "/package-lock.json",
  "/package.json",
]);
const blockedPrefixes = [
  "/.git/",
  "/.wrangler/",
  "/functions/",
  "/node_modules/",
  "/public/",
  "/scripts/",
  "/src/",
];

function normalizePathname(pathname: string) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const segments: string[] = [];
  for (const segment of decoded.split("/")) {
    if (segment === "." || segment === "") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return `/${segments.join("/")}`;
}

function wantsMarkdown(request: Request) {
  return request.headers.get("Accept")?.toLowerCase().includes("text/markdown");
}

function markdownNotFound() {
  return new Response(NOT_FOUND_MARKDOWN, {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function problemResponse(pathname: string, status: number, title: string, detail: string) {
  return new Response(
    `${JSON.stringify(
      {
        type: "https://gildrb.com/api-docs.md#errors",
        title,
        status,
        detail,
        instance: pathname,
      },
      null,
      2,
    )}\n`,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/problem+json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

const API_INDEX = {
  name: "gildrb.com public API",
  version: "v1",
  documentation: "https://gildrb.com/api-docs.md",
  openapi: "https://gildrb.com/openapi.json",
  developers: "https://gildrb.com/developers",
  endpoints: [
    {
      path: "/api/v1/profile",
      method: "GET",
      description: "Canonical JSON-LD profile and portfolio graph.",
      alias: "/api/profile",
    },
    {
      path: "/api/v1/status",
      method: "GET",
      description: "Service liveness probe.",
      alias: "/api/status",
    },
  ],
  mcp: {
    transport: "https://gildrb.com/mcp",
    manifest: "https://gildrb.com/.well-known/mcp",
  },
};

export function onRequest(context: RequestContext) {
  let url;
  try {
    url = new URL(context.request.url);
  } catch {
    return problemResponse("/", 400, "Bad Request", "Invalid request URL.");
  }
  const pathname = url.pathname;
  if (pathname === "/api" || pathname === "/api/v1") {
    return new Response(`${JSON.stringify(API_INDEX, null, 2)}\n`, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json; charset=utf-8",
        ...API_HEADERS,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const normalized = normalizePathname(pathname);
  const isApiPath =
    normalized !== null &&
    (normalized.startsWith("/api/") || normalized.startsWith("/api/v1/") || normalized === "/mcp");
  if (
    normalized === null ||
    blockedFiles.has(normalized) ||
    blockedPrefixes.some((prefix) => normalized.startsWith(prefix))
  ) {
    if (isApiPath) {
      return problemResponse(
        normalized ?? pathname,
        404,
        "Not Found",
        "Unknown API resource. See https://gildrb.com/api-docs.md for available endpoints.",
      );
    }
    if (wantsMarkdown(context.request)) {
      return markdownNotFound();
    }
    return new Response("Not found\n", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return context.next();
}
