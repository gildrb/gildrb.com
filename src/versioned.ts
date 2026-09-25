import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const urls = new Map<string, string>();

/** `path` stamped with a hash of `bytes`: the URL changes exactly when the content does. */
export function stamp(path: `/${string}`, bytes: Uint8Array): string {
  return `${path}?v=${createHash("sha256").update(bytes).digest("base64url").slice(0, 10)}`;
}

/**
 * The URL of a file in `public/`, stamped with a hash of its bytes. Fonts and images are served
 * as immutable for a year (see `public/_headers`), so a file replaced under the same name would
 * otherwise stay stale in every cache; with the stamp, changing the file changes its URL.
 * Build-time only: pages are prerendered in Node.
 */
export function versioned(path: `/${string}`): string {
  let url = urls.get(path);
  if (url === undefined) {
    url = stamp(path, readFileSync(`public${path}`));
    urls.set(path, url);
  }
  return url;
}
