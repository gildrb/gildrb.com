export const informationSlugs = ["about", "contact", "privacy", "developers"] as const;
export const informationPaths = informationSlugs.map((slug) => `/${slug}`);
