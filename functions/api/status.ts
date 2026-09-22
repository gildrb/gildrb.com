import { API_HEADERS, type RequestContext } from "../../src/server/http";
export function onRequest({ request }: Pick<RequestContext, "request">) {
  if (request.url.startsWith("https://www.gildrb.com/")) {
    return Response.redirect(
      request.url.replace("https://www.gildrb.com/", "https://gildrb.com/"),
      301,
    );
  }
  const isLegacyAlias = new URL(request.url).pathname === "/api/status";
  const headers = {
    ...API_HEADERS,
    "Cache-Control": "no-store",
    ...(isLegacyAlias && {
      Deprecation: "version=v1",
      Sunset: "Sun, 01 Aug 2027 00:00:00 GMT",
    }),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(
      `${JSON.stringify(
        {
          type: "https://gildrb.com/api-docs.md#errors",
          title: "Method Not Allowed",
          status: 405,
          detail: "Use GET or HEAD.",
        },
        null,
        2,
      )}\n`,
      {
        status: 405,
        headers: {
          ...headers,
          Allow: "GET, HEAD",
          "Content-Type": "application/problem+json; charset=utf-8",
        },
      },
    );
  }

  return new Response(
    request.method === "HEAD"
      ? null
      : JSON.stringify({
          status: "ok",
          service: "gildrb-public-api",
          version: "v1",
          timestamp: new Date().toISOString(),
        }),
    { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } },
  );
}
