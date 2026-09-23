import { slugs } from "../src/site.ts";
import { canonicalHost, type Env, problem } from "./_lib.ts";

const protocolVersions = ["2025-11-25", "2025-06-18"];

const tools = [
  {
    name: "list_portfolio_pages",
    description: "List the public portfolio pages and their Markdown URLs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_portfolio_page",
    description: "Read one public portfolio case study as Markdown.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", enum: slugs, description: "The case-study slug to retrieve." },
      },
      required: ["slug"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
];

type Message = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function headers(origin: string | null): Headers {
  const result = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, MCP-Protocol-Version, MCP-Session-Id",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "RateLimit-Limit": "60",
    "RateLimit-Policy": "60;w=60",
    "X-API-Version": "v1",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin) {
    result.set("Access-Control-Allow-Origin", origin);
    result.set("Vary", "Origin");
  }
  return result;
}

const text = (value: string, isError = false) => ({
  content: [{ type: "text", text: value }],
  ...(isError && { isError }),
});

async function call(env: Env, requestUrl: string, name: unknown, args: unknown) {
  if (name === "list_portfolio_pages") {
    const pages = slugs.map((slug) => ({
      slug,
      url: `https://gildrb.com/${slug}`,
      markdown: `https://gildrb.com/content/${slug}.md`,
    }));
    return text(JSON.stringify(pages, null, 2));
  }
  if (name !== "get_portfolio_page") return text(`Unknown tool: ${String(name)}`, true);
  const slug = typeof args === "object" && args !== null && "slug" in args ? args.slug : undefined;
  if (typeof slug !== "string" || !slugs.includes(slug))
    return text(`Unknown portfolio slug: ${String(slug)}`, true);
  const response = await env.ASSETS.fetch(new URL(`/content/${slug}.md`, requestUrl));
  return response.ok ? text(await response.text()) : text(`Unable to retrieve ${slug}.`, true);
}

async function handle(env: Env, requestUrl: string, { id, method, params }: Message) {
  const result = (value: unknown) => ({ jsonrpc: "2.0", id, result: value });
  switch (method) {
    case "initialize": {
      const requested = params?.["protocolVersion"];
      return result({
        protocolVersion:
          typeof requested === "string" && protocolVersions.includes(requested)
            ? requested
            : protocolVersions[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "com.gildrb/portfolio", version: "1.0.0" },
        instructions:
          "Use the read-only tools to discover and retrieve Gil Rodrigues portfolio pages.",
      });
    }
    case "ping":
      return result({});
    case "tools/list":
      return result({ tools });
    case "tools/call":
      return result(await call(env, requestUrl, params?.["name"], params?.["arguments"]));
    default:
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

/** A stateless, read-only MCP server over JSON-RPC (Streamable HTTP, POST only). */
export const onRequest: PagesFunction<Env> = async ({ env, request }) => {
  const redirect = canonicalHost(request);
  if (redirect) return redirect;
  const origin = request.headers.get("Origin");
  const allowed =
    !origin ||
    origin === "https://gildrb.com" ||
    origin === "https://www.gildrb.com" ||
    /^https:\/\/(?:[a-z0-9-]+\.)+pages\.dev$/i.test(origin);
  if (!allowed)
    return problem(403, "Forbidden", "Origin not allowed by the MCP CORS policy.", {
      headers: headers(origin),
    });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") {
    const response = problem(
      405,
      "Method Not Allowed",
      "Use POST with a JSON-RPC body, or OPTIONS for CORS preflight.",
      {
        headers: headers(origin),
      },
    );
    response.headers.set("Allow", "POST, OPTIONS");
    return response;
  }
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (!Number.isFinite(length) || length > 65_536) {
    return problem(413, "Content Too Large", "Request body exceeds the 64 KiB limit.", {
      headers: headers(origin),
    });
  }
  const error = (id: Message["id"], code: number, message: string, status: number) =>
    Response.json(
      { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
      { status, headers: headers(origin) },
    );
  const message: unknown = await request.json().catch(() => undefined);
  if (message === undefined) return error(null, -32700, "Parse error", 400);
  if (!isMessage(message)) return error(null, -32600, "Invalid Request", 400);
  // Notifications carry no id and get no response body.
  if (message.id === undefined)
    return new Response(null, { status: 202, headers: headers(origin) });
  return handle(env, request.url, message).then(
    (body) => Response.json(body, { headers: headers(origin) }),
    () => error(message.id, -32603, "Internal error", 500),
  );
};

function isMessage(value: unknown): value is Message {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "jsonrpc" in value &&
    value.jsonrpc === "2.0" &&
    "method" in value &&
    typeof value.method === "string"
  );
}
