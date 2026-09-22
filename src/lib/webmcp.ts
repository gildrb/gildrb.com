import { useEffect } from "preact/hooks";
import { caseProjects } from "../content/projects";
interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(args: Record<string, unknown>): Promise<unknown>;
}
interface ModelContext {
  registerTool?(tool: Tool, options: { signal: AbortSignal }): Promise<unknown>;
  provideContext?(context: { tools: Tool[] }): void;
}
/** Same optional browser tools as the original site, using the shared route registry. */
export function useWebMcp(): void {
  useEffect(() => {
    const context =
      (navigator as Navigator & { modelContext?: ModelContext }).modelContext ??
      (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context) return;
    const controller = new AbortController();
    const tools: Tool[] = [
      {
        name: "list_portfolio_pages",
        title: "List portfolio pages",
        description: "List public portfolio pages and Markdown sources.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async () => ({
          pages: caseProjects.map((project) => ({
            slug: project.slug,
            url: new URL(project.href, location.origin).href,
            markdown: new URL(`/content/${project.slug}.md`, location.origin).href,
          })),
        }),
      },
      {
        name: "open_portfolio_page",
        title: "Open a portfolio page",
        description: "Open the selected public case study in this tab.",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string", enum: caseProjects.map((project) => project.slug) },
          },
          required: ["slug"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (args) => {
          const project = caseProjects.find((item) => item.slug === args.slug);
          if (!project) throw new TypeError("Unknown portfolio slug");
          const url = new URL(project.href, location.origin);
          location.assign(url);
          return { opened: url.href };
        },
      },
    ];
    const abort = () => controller.abort();
    window.addEventListener("pagehide", abort, { once: true });
    if (context.registerTool)
      void Promise.all(
        tools.map((tool) => context.registerTool!(tool, { signal: controller.signal })),
      ).catch(() => {});
    else context.provideContext?.({ tools });
    return () => {
      abort();
      window.removeEventListener("pagehide", abort);
      if (!context.registerTool) context.provideContext?.({ tools: [] });
    };
  }, []);
}
