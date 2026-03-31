/**
 * Crawl engine — orchestrates the full crawl pipeline:
 * 1. Discover categories
 * 2. Paginate through listing pages
 * 3. Extract product details
 * 4. Map to DB entities
 * 5. Write CSV output
 */

import type {
  CrawlConfig,
  CrawlProgress,
  CrawlResult,
  SiteCrawler,
  RawProduct,
  CategoryLink,
  ProductLink,
} from "./types.js";
import { ScraperApiClient } from "./scraper-api.js";
import { mapProductsToEntities } from "./data-mapper.js";
import { writeCrawlResults, type WriteResult } from "./csv-writer.js";

export interface CrawlEngineOptions {
  /** Callback for progress updates */
  onProgress?: (progress: CrawlProgress) => void;
  /** Callback for each product extracted */
  onProduct?: (product: RawProduct) => void;
  /** Callback for errors (non-fatal) */
  onError?: (error: string, url?: string) => void;
}

export class CrawlEngine {
  private crawler: SiteCrawler;
  private client: ScraperApiClient;
  private options: CrawlEngineOptions;
  private progress: CrawlProgress;

  constructor(
    crawler: SiteCrawler,
    client: ScraperApiClient,
    options: CrawlEngineOptions = {},
  ) {
    this.crawler = crawler;
    this.client = client;
    this.options = options;
    this.progress = {
      siteId: crawler.siteId,
      phase: "discovery",
      pagesProcessed: 0,
      productsExtracted: 0,
      errorsCount: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };
  }

  /**
   * Run the full crawl pipeline for a site.
   */
  async crawl(config: CrawlConfig): Promise<{ result: CrawlResult; files: WriteResult }> {
    const products: RawProduct[] = [];

    try {
      // Phase 1: Discover categories
      this.updateProgress("discovery");
      const categories = await this.crawler.discoverCategories(config);
      this.log(`Discovered ${categories.length} categories`);

      // Filter categories if config specifies
      const targetCategories = config.categories?.length
        ? categories.filter((c) =>
            config.categories!.some(
              (target) =>
                c.name.toLowerCase().includes(target.toLowerCase()) ||
                c.url.toLowerCase().includes(target.toLowerCase()),
            ),
          )
        : categories;

      this.log(`Targeting ${targetCategories.length} categories for crawl`);

      // Phase 2: Extract products from each category
      this.updateProgress("extraction");
      for (const category of targetCategories) {
        if (config.maxProducts > 0 && products.length >= config.maxProducts) {
          this.log(`Reached max products limit (${config.maxProducts})`);
          break;
        }

        const categoryProducts = await this.crawlCategory(category, config);
        products.push(...categoryProducts);
        this.log(
          `Category "${category.name}": ${categoryProducts.length} products (total: ${products.length})`,
        );
      }

      // Phase 3: Map to entities
      this.updateProgress("mapping");
      const entities = mapProductsToEntities(products, config.siteId);

      const result: CrawlResult = {
        ...entities,
        progress: { ...this.progress },
      };

      // Write CSVs
      const files = writeCrawlResults(result, config.outputDir);
      this.log(
        `Wrote ${files.files.length} CSV files to ${config.outputDir}`,
      );

      this.updateProgress("complete");

      return { result, files };
    } catch (err) {
      this.updateProgress("error");
      throw err;
    }
  }

  /**
   * Crawl all products in a single category, handling pagination.
   */
  private async crawlCategory(
    category: CategoryLink,
    config: CrawlConfig,
  ): Promise<RawProduct[]> {
    const products: RawProduct[] = [];
    let currentUrl: string | null = category.url;

    while (currentUrl) {
      if (config.maxPages > 0 && this.progress.pagesProcessed >= config.maxPages) {
        break;
      }
      if (config.maxProducts > 0 && products.length >= config.maxProducts) {
        break;
      }

      try {
        this.progress.currentUrl = currentUrl;
        const fetchResult = await this.client.fetch(currentUrl);

        if (fetchResult.statusCode !== 200) {
          this.onError(
            `Listing page returned ${fetchResult.statusCode}`,
            currentUrl,
          );
          break;
        }

        // Extract product links from listing page
        const productLinks = this.crawler.extractProductLinks(
          fetchResult.html,
          currentUrl,
        );

        // Fetch and extract each product
        for (const link of productLinks) {
          if (config.maxProducts > 0 && products.length >= config.maxProducts) {
            break;
          }

          const product = await this.fetchProduct(link);
          if (product) {
            products.push(product);
            this.options.onProduct?.(product);
          }
        }

        this.progress.pagesProcessed++;
        this.progress.lastActivityAt = new Date();

        // Get next page URL
        currentUrl = this.crawler.getNextPageUrl(fetchResult.html, currentUrl);
      } catch (err) {
        this.onError(
          `Error crawling listing page: ${err instanceof Error ? err.message : String(err)}`,
          currentUrl ?? undefined,
        );
        break;
      }
    }

    return products;
  }

  /**
   * Fetch and extract a single product page.
   */
  private async fetchProduct(link: ProductLink): Promise<RawProduct | null> {
    try {
      const fetchResult = await this.client.fetch(link.url);

      if (fetchResult.statusCode !== 200) {
        this.onError(
          `Product page returned ${fetchResult.statusCode}`,
          link.url,
        );
        return null;
      }

      const product = this.crawler.extractProduct(fetchResult.html, link.url);

      if (product) {
        this.progress.productsExtracted++;
        this.progress.lastActivityAt = new Date();
      }

      return product;
    } catch (err) {
      this.onError(
        `Error fetching product: ${err instanceof Error ? err.message : String(err)}`,
        link.url,
      );
      return null;
    }
  }

  private updateProgress(phase: CrawlProgress["phase"]): void {
    this.progress.phase = phase;
    this.progress.lastActivityAt = new Date();
    this.options.onProgress?.({ ...this.progress });
  }

  private onError(message: string, url?: string): void {
    this.progress.errorsCount++;
    this.options.onError?.(message, url);
  }

  private log(message: string): void {
    this.options.onError?.(`[${this.crawler.siteId}] ${message}`);
  }
}
