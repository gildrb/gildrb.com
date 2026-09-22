import profile from "../src/data/profile.json";
export const schema = profile;
const person = profile["@graph"].find((entity) => entity["@type"] === "Person");
const website = profile["@graph"].find((entity) => entity["@type"] === "WebSite");
export const site = {
  name: person?.name ?? "Gil Rodrigues",
  description: website?.description ?? "Designer based in Germany.",
  email: person?.email?.replace(/^mailto:/, "") ?? "mail@gildrb.com",
  origin: "https://gildrb.com",
  title: "Gil Rodrigues (gildrb)",
} as const;
