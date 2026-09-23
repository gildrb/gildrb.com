import { apiHeaders, canonicalHost, type Env, problem } from "../_lib.ts";

/** Liveness probe; `/api/status` is the deprecated unversioned alias. */
export const onRequest: PagesFunction<Env> = ({ request }) => {
  const redirect = canonicalHost(request);
  if (redirect) return redirect;
  const headers = {
    ...apiHeaders,
    "Cache-Control": "no-store",
    ...(new URL(request.url).pathname === "/api/status" && {
      Deprecation: "version=v1",
      Sunset: "Sun, 01 Aug 2027 00:00:00 GMT",
    }),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    return problem(405, "Method Not Allowed", "Use GET or HEAD.", {
      headers: { ...headers, Allow: "GET, HEAD" },
    });
  }
  return Response.json(
    {
      status: "ok",
      service: "gildrb-public-api",
      version: "v1",
      timestamp: new Date().toISOString(),
    },
    { headers },
  );
};
