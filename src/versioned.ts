import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const hashes = new Map<string, string>();

/**
 * The URL of a file in `public/`, stamped with a hash of its bytes. Fonts and images are served
 * as immutable for a year (see `public/_headers`), so a file replaced under the same name would
 * otherwise stay stale in every cache; with the stamp, changing the file changes its URL.
 * Build-time only: pages are prerendered in Node.
 */
export function versioned(path: `/${string}`): string {
  let hash = hashes.get(path);
  if (hash === undefined) {
    hash = createHash("sha256")
      .update(readFileSync(`public${path}`))
      .digest("base64url")
      .slice(0, 10);
    hashes.set(path, hash);
  }
  return `${path}?v=${hash}`;
}
