import { describe, expect, it } from "vite-plus/test";
import { onRequest as status } from "../functions/api/status";
import { onRequest as middleware } from "../functions/_middleware";
import { onRequest as negotiate } from "../functions/[[path]]";
import { onRequest as mcp } from "../functions/mcp";
import type { RequestContext } from "../src/server/http";
import { caseProjects } from "../src/content/projects";
const context = (path: string, init: RequestInit = {}): RequestContext => ({
  request: new Request("https://gildrb.com" + path, init),
  env: {
    ASSETS: {
      fetch: async (input) => new Response(String(input instanceof Request ? input.url : input)),
    },
  },
  next: async () => new Response("next"),
});
describe("typed HTTP compatibility", () => {
  it("GET and HEAD status preserve liveness and headers", async () => {
    expect(await status(context("/api/v1/status")).json()).toMatchObject({
      status: "ok",
      version: "v1",
    });
    expect(await status(context("/api/v1/status", { method: "HEAD" })).text()).toBe("");
  });
  it("status rejects writes", () =>
    expect(status(context("/api/v1/status", { method: "POST" })).status).toBe(405));
  it("marks legacy API aliases", () =>
    expect(status(context("/api/status")).headers.get("Deprecation")).toBe("version=v1"));
  it("blocks source files", async () =>
    expect((await middleware(context("/src/app.tsx"))).status).toBe(404));
  it("does not turn malformed escapes into a server error", async () =>
    expect((await middleware(context("/%E0%A4%A"))).status).toBe(404));
  it("negotiates every case Markdown route from the registry", async () => {
    for (const project of caseProjects) {
      const result = await negotiate(
        context(project.href, { headers: { Accept: "text/markdown" } }),
      );
      expect(result.headers.get("Vary")).toBe("Accept");
      expect(await result.text()).toContain(`/content/${project.slug}.md`);
    }
  });
  it("preserves versioned profile alias", async () =>
    expect(await (await negotiate(context("/api/v1/profile"))).text()).toContain("/profile.json"));
});
describe("read-only MCP", () => {
  const request = (body: unknown) =>
    mcp(
      context("/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  it("initializes the supported protocol", async () =>
    expect(
      await (
        await request({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-11-25" },
        })
      ).json(),
    ).toMatchObject({ result: { protocolVersion: "2025-11-25" } }));
  it("discovers exactly the existing authored case pages", async () => {
    const response = await (
      await request({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "list_portfolio_pages" },
      })
    ).json();
    expect(
      JSON.parse(response.result.content[0].text).map((page: { slug: string }) => page.slug),
    ).toEqual(caseProjects.map((project) => project.slug));
  });
  it("does not follow arbitrary tool arguments", async () =>
    expect(
      await (
        await request({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_portfolio_page", arguments: { slug: "../../secrets" } },
        })
      ).json(),
    ).toMatchObject({ result: { isError: true } }));
  it("rejects invalid messages and identifiers", async () => {
    expect((await request([])).status).toBe(400);
    expect((await request({ jsonrpc: "2.0", method: "ping", id: {} })).status).toBe(400);
  });
  it("rejects oversized bodies even without Content-Length", async () =>
    expect(
      (await request({ jsonrpc: "2.0", id: 1, method: "ping", data: "x".repeat(66000) })).status,
    ).toBe(413));
  it("rejects unapproved origins", async () =>
    expect(
      (
        await mcp(
          context("/mcp", { method: "OPTIONS", headers: { Origin: "https://untrusted.example" } }),
        )
      ).status,
    ).toBe(403));
  it("accepts notifications without inventing a response id", async () =>
    expect((await request({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(
      202,
    ));
});
