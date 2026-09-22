# Portfolio content

Edit `projects.ts` for the project registry, `links.ts` for public links and each case's Markdown file for its copy. `media.json` maps case-local `media:` identifiers to the existing image, video or demo assets. Images in one Markdown paragraph become a shared gallery component.

`build/content.ts` converts Markdown into typed content modules during Vite builds. It also emits canonical Markdown, the profile and sitemap. Preact components are shared between prerendering and the browser. Do not create a second HTML template, project list or manually concatenated script.

`heph.ts` contains the original local demo's book excerpts and scripted responses. It does not call a language model or external service.
