import type { CaseDocument } from "../lib/types";
import { caseProjects } from "../content/projects";
import manifest from "../content/media.json";
import { HephDemo } from "./HephDemo";
interface ImageData {
  src?: string;
  srcset?: string;
  sizes?: string;
  alt?: string;
  width?: string;
  height?: string;
  class?: string;
  demo?: string;
  html?: string;
}
const media: Record<string, ImageData> = manifest;
function Media({ slug, id, caption }: { slug: string; id: string; caption?: string }) {
  const data = media[`${slug}/${id}`];
  if (!data) throw new Error(`Missing media: ${slug}/${id}`);
  return (
    <figure class="case-media">
      {data.demo ? (
        <HephDemo />
      ) : data.html ? (
        <div dangerouslySetInnerHTML={{ __html: data.html }} />
      ) : (
        <img
          src={data.src}
          srcSet={data.srcset}
          sizes={data.sizes}
          width={Number(data.width)}
          height={Number(data.height)}
          alt={data.alt ?? ""}
          class={data.class}
          loading="lazy"
          decoding="async"
        />
      )}
      {caption && <figcaption class="case-caption">{caption}</figcaption>}
    </figure>
  );
}
export interface CaseStudyProps {
  slug: string;
  document: CaseDocument;
  next?: boolean;
}
export function CaseStudy({ slug, document, next = true }: CaseStudyProps) {
  return (
    <article class="case-article">
      <header class="case-intro">
        <h1 class="case-title">{document.title}</h1>
      </header>
      <div class="case-markdown">
        {document.blocks.map((block, index) =>
          block.type === "gallery" ? (
            <div class="case-gallery" key={index}>
              {block.images.map((image) => (
                <Media key={image.id} slug={slug} {...image} />
              ))}
            </div>
          ) : block.type === "media" ? (
            <Media key={index} slug={slug} id={block.id} caption={block.caption} />
          ) : block.type === "code" ? (
            <div class="case-code" key={index}>
              {block.title && <p class="case-code-label">{block.title}</p>}
              <pre>
                <code class={`language-${block.language}`}>{block.code}</code>
              </pre>
            </div>
          ) : (
            <div class="case-copy" key={index} dangerouslySetInnerHTML={{ __html: block.html }} />
          ),
        )}
      </div>
      {next && (
        <nav class="case-next" aria-label="All projects">
          <h2>View next</h2>
          {caseProjects
            .filter((project) => project.slug !== slug)
            .map((project) => (
              <a class="case-next-row" key={project.slug} href={project.href}>
                <time dateTime={project.date}>{project.date.slice(0, 7)}</time>
                <span>{project.title}</span>
                <span>{project.scope}</span>
                <span aria-hidden="true">→</span>
              </a>
            ))}
        </nav>
      )}
    </article>
  );
}
