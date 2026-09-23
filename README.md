Source for [gildrb.com](https://gildrb.com).

A static site prerendered with [Vite+](https://viteplus.dev), [Preact](https://preactjs.com) and
[StyleX](https://stylexjs.com). Only the interactive parts (theme toggle, email copy, project
table, Heph demo) ship JavaScript; everything else is plain HTML with inlined CSS.

```sh
vp dev     # http://127.0.0.1:5174 (or the next free port)
vp build   # dist/, the Cloudflare Pages output directory
vp check   # format, lint and type check
```

## Layout

- `src/content/*.md`: case studies and the about/contact/privacy/developers pages. Also served
  raw at `/content/<name>.md`.
- `src/site.ts`: profile links, case-study metadata and the homepage project list.
- `src/media.ts`: alt text and size for every image referenced from Markdown.
- `src/tokens.stylex.ts`: OKLCH colors, spacing and breakpoints.
- `src/render.tsx`: builds every page, `profile.json`, `llms-full.txt` and `/content`.
- `src/client.ts`: hydrates the islands and runs the few layout measurements.
- `public/`: static files copied as-is (images, fonts, `.well-known`, `_headers`).
- `functions/`: Cloudflare Pages Functions (Markdown negotiation, API, MCP server).

## Writing case studies

Each case study is one Markdown file in `src/content/`, listed in `cases` in `src/site.ts`.
Start with a single `# Title`, then write ordinary Markdown:

```markdown
# Your case-study title

Paragraphs, **bold**, `inline code`, [external links](https://example.com) and
[internal links](/filen).

### A short signpost inside a continuous story

- Lists work too; keep each item on one line.

## A major section, with a chapter-sized gap above it
```

Images use a `media:` reference; the bracket text is the visible caption (five words at most):

```markdown
![Final Filen lockup](media:filen-wordmark)
```

The id needs an entry in `src/media.ts` and files named
`public/images/optimized/gil-rodrigues-<id>-<width>.webp` (or one `.svg`). Consecutive media lines
form a two-column grid. `media:heph-demo` embeds the interactive Heph terminal.

Fenced code blocks can carry a visible label; `toml` blocks are highlighted:

````markdown
```text title="A short label"
command --example
```
````
