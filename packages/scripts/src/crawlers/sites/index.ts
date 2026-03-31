import type { SiteCrawler } from "../types.js";
import { OscaroCrawler } from "./oscaro.js";
import { AutodocCrawler } from "./autodoc.js";
import { MisterAutoCrawler } from "./mister-auto.js";
// Tier 2 — Specialized French sites
import { PiecesAutoCrawler } from "./piecesauto.js";
import { DapartoCrawler } from "./daparto.js";
import { PartAutoCrawler } from "./partauto.js";
import { DistriAutoCrawler } from "./distriauto.js";
import { WebDealAutoCrawler } from "./webdealauto.js";
// Tier 3 — Used parts
import { OpistoCrawler } from "./opisto.js";
import { OvokoCrawler } from "./ovoko.js";
// Tier 4 — European/International
import { FcpEuroCrawler } from "./fcpeuro.js";
import { RockAutoCrawler } from "./rockauto.js";
import { SpareToCrawler } from "./spareto.js";

/** Registry of all available site crawlers */
export const crawlerRegistry: Record<string, () => SiteCrawler> = {
  // Tier 1 — Major French e-commerce
  oscaro: () => new OscaroCrawler(),
  autodoc: () => new AutodocCrawler(),
  "mister-auto": () => new MisterAutoCrawler(),
  // Tier 2 — Specialized French sites
  piecesauto: () => new PiecesAutoCrawler(),
  daparto: () => new DapartoCrawler(),
  partauto: () => new PartAutoCrawler(),
  distriauto: () => new DistriAutoCrawler(),
  webdealauto: () => new WebDealAutoCrawler(),
  // Tier 3 — Used parts
  opisto: () => new OpistoCrawler(),
  ovoko: () => new OvokoCrawler(),
  // Tier 4 — European/International
  fcpeuro: () => new FcpEuroCrawler(),
  rockauto: () => new RockAutoCrawler(),
  spareto: () => new SpareToCrawler(),
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

// Tier 1
export { OscaroCrawler } from "./oscaro.js";
export { AutodocCrawler } from "./autodoc.js";
export { MisterAutoCrawler } from "./mister-auto.js";
// Tier 2
export { PiecesAutoCrawler } from "./piecesauto.js";
export { DapartoCrawler } from "./daparto.js";
export { PartAutoCrawler } from "./partauto.js";
export { DistriAutoCrawler } from "./distriauto.js";
export { WebDealAutoCrawler } from "./webdealauto.js";
// Tier 3
export { OpistoCrawler } from "./opisto.js";
export { OvokoCrawler } from "./ovoko.js";
// Tier 4
export { FcpEuroCrawler } from "./fcpeuro.js";
export { RockAutoCrawler } from "./rockauto.js";
export { SpareToCrawler } from "./spareto.js";
