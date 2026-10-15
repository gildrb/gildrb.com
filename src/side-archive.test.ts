// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"enableJavaScriptEvaluation":true}}
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { buildSideArchive, type SideArchiveData } from "./side-archive.ts";

const data: SideArchiveData = {
  classes: { link: "l", cell: "c", frame: "f", caption: "cap", art: "art", markArt: "art mark" },
  images: "/images/optimized/gil-rodrigues-",
  sizes: "320px",
  tiles: [
    {
      href: "/t3",
      label: "T3",
      alt: "T3 mark",
      width: 1200,
      height: 1200,
      share: "100.000",
      src: "t3-mark-960.a.webp",
      srcset: "t3-mark-480.b.webp 480w, t3-mark-960.a.webp 960w",
    },
    {
      href: "/heph",
      label: "Heph",
      alt: "Heph lockup",
      width: 3023,
      height: 860,
      share: "88.000",
      src: "heph-lockup.c.svg",
      mark: true,
    },
    {
      href: "/local-studio",
      label: "Local Studio",
      alt: "Site tour",
      width: 1080,
      height: 1014,
      share: "100.000",
      src: "local-studio-tour-480.d.webp",
      video: "/videos/gil-rodrigues-local-studio-tour.e.mp4",
    },
    {
      href: "/all?open=archive-book-mark",
      label: "Archive",
      alt: "Book mark",
      width: 1504,
      height: 1128,
      share: "100.000",
      src: "archive-book-mark-960.f.webp",
    },
  ],
};

/**
 * Runs the builder the way pages do: its own source in an inline script right after an empty
 * grid, so it reaches nothing of this module and finds the grid through `currentScript`.
 */
function build(): HTMLElement {
  document.body.innerHTML = '<section><div id="grid"></div></section>';
  const grid = document.querySelector<HTMLElement>("#grid");
  if (grid === null) throw new Error("fixture missing");
  const script = document.createElement("script");
  script.textContent = `(${buildSideArchive.toString()})(${JSON.stringify(data)})`;
  grid.after(script);
  return grid;
}

const byText = (left: string, right: string) => left.localeCompare(right);

afterEach(() => vi.restoreAllMocks());

describe("buildSideArchive", () => {
  test("builds every tile exactly once, as a link to where it belongs", () => {
    const links = [...build().querySelectorAll("a")];
    expect(links.map((link) => link.getAttribute("href") ?? "").toSorted(byText)).toEqual(
      data.tiles.map(({ href }) => href).toSorted(byText),
    );
    const t3 = links.find((link) => link.getAttribute("href") === "/t3");
    expect(t3?.getAttribute("aria-label")).toBe("T3: T3 mark");
    expect(t3?.querySelector("span")?.textContent).toBe("T3");
  });

  test("restores full image paths in src and in every srcset candidate", () => {
    const image = build().querySelector<HTMLImageElement>('a[href="/t3"] img');
    expect(image?.getAttribute("src")).toBe("/images/optimized/gil-rodrigues-t3-mark-960.a.webp");
    expect(image?.getAttribute("srcset")).toBe(
      "/images/optimized/gil-rodrigues-t3-mark-480.b.webp 480w, /images/optimized/gil-rodrigues-t3-mark-960.a.webp 960w",
    );
    expect(image?.getAttribute("sizes")).toBe("320px");
    expect(image?.getAttribute("loading")).toBe("lazy");
  });

  test("sizes the frame to the artwork's share and marks logo artwork", () => {
    const grid = build();
    const frame = grid.querySelector<HTMLElement>('a[href="/heph"] .f');
    expect(frame?.getAttribute("style")).toBe("width:88.000%;");
    const mark = grid.querySelector('a[href="/heph"] img');
    expect(mark?.getAttribute("class")).toBe("art mark");
    expect(mark?.hasAttribute("srcset")).toBe(false);
  });

  test("builds recordings as muted videos that autoplay, poster from the image files", () => {
    const video = build().querySelector<HTMLVideoElement>('a[href="/local-studio"] video');
    expect(video?.muted).toBe(true);
    expect(video?.hasAttribute("data-autoplay")).toBe(true);
    expect(video?.getAttribute("poster")).toBe(
      "/images/optimized/gil-rodrigues-local-studio-tour-480.d.webp",
    );
    expect(video?.getAttribute("src")).toBe("/videos/gil-rodrigues-local-studio-tour.e.mp4");
  });

  test("orders the tiles by random draw", () => {
    const draws = [0.9, 0.1, 0.5, 0.3];
    vi.spyOn(Math, "random").mockImplementation(() => draws.shift() ?? 0);
    const order = [...build().querySelectorAll("a")].map((link) => link.getAttribute("href"));
    expect(order).toEqual(["/heph", "/all?open=archive-book-mark", "/local-studio", "/t3"]);
  });
});
