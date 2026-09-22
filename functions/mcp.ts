import { caseProjects } from "../src/content/projects";
import { API_HEADERS, type AssetEnvironment, type RequestContext } from "../src/server/http";
type ObjectValue = Record<string, unknown>;
const record = (value: unknown): ObjectValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as ObjectValue)
    : {};
interface RpcMessage {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: ObjectValue;
}
const SERVER_INFO = Object.freeze({
  name: "com.gildrb/portfolio",
  version: "1.0.0",
});

const PROTOCOL_VERSIONS = Object.freeze(["2025-11-25", "2025-06-18"]);
const PAGE_SLUGS: readonly string[] = caseProjects.map((project) => project.slug);

const TOOLS = Object.freeze([
  {
    name: "list_portfolio_pages",
    description: "List the public portfolio pages and their Markdown URLs.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_portfolio_page",
    description: "Read one public portfolio case study as Markdown.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          enum: PAGE_SLUGS,
          description: "The case-study slug to retrieve.",
        },
      },
      required: ["slug"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
]);

function responseHeaders(origin: string | null) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version, MCP-Session-Id",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...API_HEADERS,
    "X-Content-Type-Options": "nosniff",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

function isAllowedOrigin(origin: string | null) {
  return (
    !origin ||
    origin === "https://gildrb.com" ||
    origin === "https://www.gildrb.com" ||
    /^https:\/\/(?:[a-z0-9-]+\.)+pages\.dev$/i.test(origin)
  );
}

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return Response.json(body, {
    status,
    headers: responseHeaders(origin),
  });
}

function problemJsonResponse(origin: string | null, status: number, title: string, detail: string) {
  const headers = responseHeaders(origin);
  headers.set("Content-Type", "application/problem+json; charset=utf-8");
  return new Response(
    `${JSON.stringify(
      {
        type: "https://gildrb.com/api-docs.md#errors",
        title,
        status,
        detail,
      },
      null,
      2,
    )}\n`,
    {
      status,
      headers,
    },
  );
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

async function callTool(env: AssetEnvironment, requestUrl: string, name: unknown, args: unknown) {
  if (name === "list_portfolio_pages") {
    return textResult(
      JSON.stringify(
        PAGE_SLUGS.map((slug) => ({
          slug,
          url: `https://gildrb.com/${slug}`,
          markdown: `https://gildrb.com/content/${slug}.md`,
        })),
        null,
        2,
      ),
    );
  }

  if (name === "get_portfolio_page") {
    const slug = record(args).slug;
    if (typeof slug !== "string" || !PAGE_SLUGS.includes(slug)) {
      return {
        ...textResult(`Unknown portfolio slug: ${String(slug)}`),
        isError: true,
      };
    }

    const assetUrl = new URL(`/content/${slug}.md`, requestUrl);
    const response = await env.ASSETS.fetch(assetUrl);
    if (!response.ok) {
      return {
        ...textResult(`Unable to retrieve ${slug}.`),
        isError: true,
      };
    }
    return textResult(await response.text());
  }

  return {
    ...textResult(`Unknown tool: ${String(name)}`),
    isError: true,
  };
}

async function handleRequest(env: AssetEnvironment, requestUrl: string, message: RpcMessage) {
  const { id, method, params } = message;

  if (method === "initialize") {
    const requestedVersion = params?.protocolVersion;
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSIONS.includes(String(requestedVersion))
          ? requestedVersion
          : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Use the read-only tools to discover and retrieve Gil Rodrigues portfolio pages.",
      },
    };
  }
  if (method === "ping") {
    return { jsonrpc: "2.0", id, result: {} };
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  }
  if (method === "tools/call") {
    return {
      jsonrpc: "2.0",
      id,
      result: await callTool(env, requestUrl, params?.name, params?.arguments),
    };
  }
  return jsonRpcError(id, -32601, `Method not found: ${String(method)}`);
}

export async function onRequest({ env, request }: RequestContext) {
  if (request.url.startsWith("https://www.gildrb.com/")) {
    return Response.redirect(
      request.url.replace("https://www.gildrb.com/", "https://gildrb.com/"),
      301,
    );
  }
  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin)) {
    return problemJsonResponse(
      origin,
      403,
      "Forbidden",
      "Origin not allowed by the MCP CORS policy.",
    );
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: responseHeaders(origin),
    });
  }
  if (request.method !== "POST") {
    const response = problemJsonResponse(
      origin,
      405,
      "Method Not Allowed",
      "Use POST with a JSON-RPC body, or OPTIONS for CORS preflight.",
    );
    response.headers.set("Allow", "POST, OPTIONS");
    return response;
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 65_536) {
    return problemJsonResponse(
      origin,
      413,
      "Content Too Large",
      "Request body exceeds the 64 KiB limit.",
    );
  }

  let message: ObjectValue;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 65_536)
      return problemJsonResponse(
        origin,
        413,
        "Content Too Large",
        "Request body exceeds the 64 KiB limit.",
      );
    message = record(JSON.parse(body));
  } catch {
    return jsonResponse(jsonRpcError(null, -32700, "Parse error"), 400, origin);
  }
  if (
    !message ||
    Array.isArray(message) ||
    message.jsonrpc !== "2.0" ||
    typeof message.method !== "string" ||
    (message.id !== undefined &&
      message.id !== null &&
      typeof message.id !== "string" &&
      typeof message.id !== "number")
  ) {
    return jsonResponse(jsonRpcError(null, -32600, "Invalid Request"), 400, origin);
  }
  if (message.id === undefined) {
    return new Response(null, {
      status: 202,
      headers: responseHeaders(origin),
    });
  }

  try {
    return jsonResponse(
      await handleRequest(env, request.url, {
        jsonrpc: "2.0",
        id: message.id as string | number | null,
        method: String(message.method),
        params: record(message.params),
      }),
      200,
      origin,
    );
  } catch {
    return jsonResponse(jsonRpcError(message.id, -32603, "Internal error"), 500, origin);
  }
}
