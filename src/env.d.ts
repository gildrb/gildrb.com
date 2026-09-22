/// <reference types="@webgpu/types" />
declare module "*.wgsl" {
  const shader: string;
  export default shader;
}
declare module "*.md" {
  const document: import("./lib/types").CaseDocument;
  export default document;
}
declare module "virtual:portfolio-site" {
  const site: {
    readonly name: string;
    readonly description: string;
    readonly email: string;
    readonly origin: string;
    readonly title: string;
  };
  export default site;
}
