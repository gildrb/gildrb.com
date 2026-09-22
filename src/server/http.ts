export interface AssetEnvironment {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
}
export interface RequestContext {
  request: Request;
  env: AssetEnvironment;
  next(): Promise<Response>;
}
export const API_HEADERS = {
  "RateLimit-Limit": "60",
  "RateLimit-Policy": "60;w=60",
  "X-API-Version": "v1",
};
export const NOT_FOUND_MARKDOWN = `# Not found

This path does not exist on gildrb.com. The response is a real HTTP 404.

- [Homepage](https://gildrb.com/)
- [All projects](https://gildrb.com/all)
- [Sitemap](https://gildrb.com/sitemap.xml)
- [llms.txt](https://gildrb.com/llms.txt)
- [llms-full.txt](https://gildrb.com/llms-full.txt)
- [Developer resources](https://gildrb.com/developers)
`;
export function withHeaders(response: Response, headers: Record<string, string>): Response {
  const next = new Headers(response.headers);
  for (const [name, value] of Object.entries(headers)) next.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: next,
  });
}
