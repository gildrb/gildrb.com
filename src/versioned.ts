import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** Stamped path → the `public/` path it is a copy of. */
const copies = new Map<string, `/${string}`>();
/** `public/` path → its stamped path, so each file is hashed once. */
const stamped = new Map<string, string>();

/**
 * `path` with a hash of `bytes` in its file name (`/images/og-image.3kQ…x.png`): the URL changes
 * exactly when the content does. The hash is in the name, not a query string, so the new URL does
 * not exist until the deploy carrying it is live; nothing can cache old bytes under it meanwhile.
 */
export function stamp(path: `/${string}`, bytes: Uint8Array): string {
  const hash = createHash("sha256").update(bytes).digest("base64url").slice(0, 10);
  const dot = path.lastIndexOf(".");
  if (dot <= path.lastIndexOf("/")) throw new Error(`No file extension to stamp before: ${path}`);
  return `${path.slice(0, dot)}.${hash}${path.slice(dot)}`;
}

/**
 * The URL of a file in `public/`, stamped with a hash of its bytes. Fonts and images are served
 * as immutable for a year (see `public/_headers`), so a file replaced under the same name would
 * otherwise stay stale in every cache. The build copies each file to its stamped path
 * (`versionedCopies`); the dev server serves it from there. Build-time only.
 */
export function versioned(path: `/${string}`): string {
  let url = stamped.get(path);
  if (url === undefined) {
    url = stamp(path, readFileSync(`public${path}`));
    stamped.set(path, url);
    copies.set(url, path);
  }
  return url;
}

/** Every stamped path handed out so far, with the `public/` file it copies. */
export function versionedCopies(): ReadonlyMap<string, `/${string}`> {
  return copies;
}
