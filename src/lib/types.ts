export interface MediaReference {
  id: string;
  caption: string;
}
export type CaseBlock =
  | { type: "html"; html: string }
  | { type: "media"; id: string; caption: string }
  | { type: "gallery"; images: MediaReference[] }
  | { type: "code"; code: string; language?: string; title?: string };
export interface CaseDocument {
  title: string;
  blocks: CaseBlock[];
}
