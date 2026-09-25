/** Google's woff2 decoder compiled to WebAssembly; the package ships no types. */
declare module "wawoff2" {
  /** Unpacks a WOFF2 file into the TrueType font it wraps. */
  export function decompress(woff2: Uint8Array): Promise<Uint8Array>;
}
