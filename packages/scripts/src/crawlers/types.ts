/**
 * Core types for the web crawling framework.
 * Each crawler outputs data compatible with the ingestion pipeline CSV row types.
 */

import type {
  ManufacturerRow,
  CategoryRow,
  PartRow,
  VehicleRow,
  CompatibilityRow,
  CrossReferenceRow,
} from "../ingestion/types.js";

// --- Crawl Configuration ---

export interface ScraperApiConfig {
  apiKey: string;
  /** Use ScraperAPI's rendering (Puppeteer-backed) for JS-heavy sites */
  render?: boolean;
  /** Country code for geo-targeted requests */
  country?: string;
  /** Enable premium residential proxies */
  premium?: boolean;
  /** Session stickiness number (reuse same IP for paginated crawls) */
  sessionNumber?: number;
}

export interface CrawlConfig {
  /** Target site identifier (e.g. "oscaro", "autodoc") */
  siteId: string;
  /** Base URL of the target site */
  baseUrl: string;
  /** ScraperAPI configuration */
  scraperApi: ScraperApiConfig;
  /** Maximum concurrent requests */
  concurrency: number;
  /** Delay between requests in ms */
  requestDelayMs: number;
  /** Maximum number of pages to crawl (0 = unlimited) */
  maxPages: number;
  /** Maximum number of products to crawl (0 = unlimited) */
  maxProducts: number;
  /** Output directory for CSV files */
  outputDir: string;
  /** Categories to crawl (empty = all) */
  categories?: string[];
}

// --- Crawl Progress ---

export interface CrawlProgress {
  siteId: string;
  phase: "discovery" | "extraction" | "mapping" | "complete" | "error";
  pagesProcessed: number;
  productsExtracted: number;
  errorsCount: number;
  startedAt: Date;
  lastActivityAt: Date;
  currentUrl?: string;
}

// --- Raw Product Data (extracted from HTML) ---

export interface RawProduct {
  /** Source URL of the product page */
  sourceUrl: string;
  /** Product name / title */
  name: string;
  /** Product description */
  description?: string;
  /** OEM / manufacturer reference number */
  oemNumber?: string;
  /** Brand / manufacturer name */
  brand?: string;
  /** Category breadcrumb (e.g. ["Freinage", "Plaquettes de frein"]) */
  categoryPath?: string[];
  /** Compatible vehicles extracted from the page */
  compatibleVehicles?: RawVehicleCompatibility[];
  /** Cross-reference / equivalent part numbers */
  crossReferences?: RawCrossReference[];
  /** Price in euros (informational) */
  priceEur?: number;
  /** Image URLs */
  imageUrls?: string[];
  /** Weight in grams */
  weightGrams?: number;
  /** Additional structured specs */
  specifications?: Record<string, string>;
}

export interface RawVehicleCompatibility {
  make: string;
  model: string;
  yearStart?: number;
  yearEnd?: number;
  engineCode?: string;
  engineDisplacementCc?: number;
  fuelType?: string;
  bodyType?: string;
  trim?: string;
  fitmentNotes?: string;
  quantity?: number;
  position?: string;
}

export interface RawCrossReference {
  oemNumber: string;
  manufacturer?: string;
  type?: string;
  notes?: string;
}

// --- Category Link (for site discovery) ---

export interface CategoryLink {
  name: string;
  url: string;
  parentName?: string;
  productCount?: number;
}

// --- Product Link (from listing pages) ---

export interface ProductLink {
  url: string;
  name?: string;
  oemNumber?: string;
}

// --- Crawl Results ---

export interface CrawlResult {
  siteId: string;
  manufacturers: ManufacturerRow[];
  categories: CategoryRow[];
  parts: PartRow[];
  vehicles: VehicleRow[];
  compatibility: CompatibilityRow[];
  crossReferences: CrossReferenceRow[];
  progress: CrawlProgress;
}

// --- Base Crawler Interface ---

export interface SiteCrawler {
  readonly siteId: string;
  readonly baseUrl: string;

  /** Discover category structure and product listing pages */
  discoverCategories(config: CrawlConfig): Promise<CategoryLink[]>;

  /** Extract product links from a category/listing page */
  extractProductLinks(
    html: string,
    pageUrl: string,
  ): ProductLink[];

  /** Extract full product data from a product detail page */
  extractProduct(html: string, pageUrl: string): RawProduct | null;

  /** Check if a listing page has a next page, return its URL */
  getNextPageUrl(html: string, currentUrl: string): string | null;
}
