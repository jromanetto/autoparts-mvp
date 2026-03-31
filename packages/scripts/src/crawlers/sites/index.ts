import type { SiteCrawler } from "../types.js";
import { OscaroCrawler } from "./oscaro.js";
import { AutodocCrawler } from "./autodoc.js";
import { MisterAutoCrawler } from "./mister-auto.js";

/** Registry of all available site crawlers */
export const crawlerRegistry: Record<string, () => SiteCrawler> = {
  oscaro: () => new OscaroCrawler(),
  autodoc: () => new AutodocCrawler(),
  "mister-auto": () => new MisterAutoCrawler(),
};

export function getCrawler(siteId: string): SiteCrawler {
  const factory = crawlerRegistry[siteId];
  if (!factory) {
    const available = Object.keys(crawlerRegistry).join(", ");
    throw new Error(`Unknown site "${siteId}". Available: ${available}`);
  }
  return factory();
}

export function listCrawlers(): string[] {
  return Object.keys(crawlerRegistry);
}

export { OscaroCrawler } from "./oscaro.js";
export { AutodocCrawler } from "./autodoc.js";
export { MisterAutoCrawler } from "./mister-auto.js";
