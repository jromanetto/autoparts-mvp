/**
 * RockAuto.com crawler — Massive US auto parts catalog.
 * One of the largest online auto parts catalogs worldwide.
 *
 * Site structure:
 * - Category pages: /catalog/{make},{model},{year},{category}
 * - Product listings inline within category pages
 * - Deeply nested category hierarchy (make > model > year > system > component)
 * - Parts listed with part numbers, brands, and prices
 * - No individual product pages — all info on listing pages
 */

import * as cheerio from "cheerio";
import type {
  SiteCrawler,
  CrawlConfig,
  CategoryLink,
  ProductLink,
  RawProduct,
  RawVehicleCompatibility,
  RawCrossReference,
} from "../types.js";
import { ScraperApiClient } from "../scraper-api.js";

export class RockAutoCrawler implements SiteCrawler {
  readonly siteId = "rockauto";
  readonly baseUrl = "https://www.rockauto.com";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    // RockAuto organizes by make — start with European makes relevant to our catalog
    const targetMakes = [
      "VOLKSWAGEN", "BMW", "MERCEDES+BENZ", "AUDI", "RENAULT",
      "PEUGEOT", "CITROEN", "FIAT", "VOLVO", "OPEL",
      "TOYOTA", "HONDA", "HYUNDAI", "KIA", "NISSAN",
    ];

    for (const make of targetMakes) {
      if (config.maxPages > 0 && categories.length >= config.maxPages) break;

      const makeUrl = `${this.baseUrl}/catalog/${make}`;
      const result = await client.fetch(makeUrl);

      if (result.statusCode !== 200) continue;

      const $ = cheerio.load(result.html);

      // Model/year links
      $('a[href*="/catalog/"]').each((_i, el) => {
        const href = $(el).attr("href");
        const name = $(el).text().trim();
        if (href && name && name.length > 1 && name.length < 100) {
          const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
          if (!categories.some((c) => c.url === fullUrl)) {
            categories.push({
              name: `${make} - ${name}`,
              url: fullUrl,
              parentName: make,
            });
          }
        }
      });
    }

    return categories;
  }

  extractProductLinks(html: string, pageUrl: string): ProductLink[] {
    const $ = cheerio.load(html);
    const links: ProductLink[] = [];

    // RockAuto lists parts inline — extract part numbers and treat each as a "product"
    // Each part row has the info we need right in the listing
    $('[class*="listing-inner"], [class*="ra-listing"], tr[id*="listingcontainer"]').each(
      (_i, el) => {
        const partNumber =
          $(el).find('[class*="listing-final-partnumber"], [class*="part-number"]').text().trim();
        if (!partNumber) return;

        // For RockAuto, the "product link" is the listing row itself
        // We'll use the current page URL + part number as a unique key
        const url = `${pageUrl}#${partNumber}`;
        if (links.some((l) => l.url === url)) return;

        const name = $(el).find('[class*="listing-text-description"], [class*="description"]').text().trim();

        links.push({
          url,
          name: name || undefined,
          oemNumber: partNumber,
        });
      },
    );

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

    // RockAuto embeds product info in listing pages, not separate product pages
    // If we're on a listing page, extract inline
    const name = $('h1, [class*="page-title"]').first().text().trim();
    if (!name) return null;

    const oemNumber = this.extractOemNumber($);
    if (!oemNumber) return null;

    const brand = this.extractBrand($);
    const description =
      $('[class*="listing-text-description"], [class*="description"]').first().text().trim() ||
      undefined;

    // Parse vehicle from URL path: /catalog/MAKE,MODEL,YEAR,...
    const compatibleVehicles = this.parseVehicleFromUrl(pageUrl);

    const priceEur = this.extractPrice($);
    const imageUrls = this.extractImages($);
    const crossReferences = this.extractCrossReferences($);

    return {
      sourceUrl: pageUrl,
      name,
      description,
      oemNumber,
      brand,
      compatibleVehicles,
      crossReferences,
      priceEur,
      imageUrls,
    };
  }

  getNextPageUrl(html: string, _currentUrl: string): string | null {
    const $ = cheerio.load(html);
    // RockAuto uses "More parts" or subcategory links
    const nextLink = $(
      'a:contains("More"), [class*="next"] a, a[class*="navnextpage"]',
    ).first();
    const href = nextLink.attr("href");
    if (!href) return null;
    return href.startsWith("http") ? href : `${this.baseUrl}${href}`;
  }

  /**
   * Parse vehicle info from RockAuto URL path.
   * URLs follow: /catalog/MAKE,MODEL,YEAR,SYSTEM,COMPONENT
   */
  private parseVehicleFromUrl(url: string): RawVehicleCompatibility[] | undefined {
    const match = url.match(/\/catalog\/([^,]+),([^,]+),(\d{4})/);
    if (!match) return undefined;

    const make = match[1].replace(/\+/g, " ");
    const model = match[2].replace(/\+/g, " ");
    const year = parseInt(match[3], 10);

    return [{ make, model, yearStart: year, yearEnd: year }];
  }

  private extractOemNumber($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[class*="listing-final-partnumber"]',
      '[class*="part-number"]',
      '[itemprop="mpn"]',
      '[itemprop="sku"]',
    ];
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 3 && text.length <= 50) return text;
    }
    return undefined;
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[class*="listing-final-manufacturer"]',
      '[class*="brand"]',
      '[itemprop="brand"]',
    ];
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 2 && text.length <= 50) return text;
    }
    return undefined;
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    const priceText =
      $('[class*="listing-final-price"], [class*="ra-price"]').first().text().trim();
    if (!priceText) return undefined;
    const match = priceText.replace(/[,$\s]/g, "").match(/([\d]+\.[\d]{2})/);
    if (match) {
      // Convert USD to EUR (approximate)
      return Math.round(parseFloat(match[1]) * 0.92 * 100) / 100;
    }
    return undefined;
  }

  private extractImages($: cheerio.CheerioAPI): string[] | undefined {
    const images: string[] = [];
    $('[class*="listing"] img[src], [class*="part-image"] img[src]').each((_i, el) => {
      const src = $(el).attr("src");
      if (src && !src.includes("placeholder") && !src.includes("spacer")) {
        const fullUrl = src.startsWith("http") ? src : `${this.baseUrl}${src}`;
        if (!images.includes(fullUrl)) images.push(fullUrl);
      }
    });
    return images.length > 0 ? images : undefined;
  }

  private extractCrossReferences($: cheerio.CheerioAPI): RawCrossReference[] | undefined {
    const refs: RawCrossReference[] = [];
    $('[class*="listing-text-more-info"] a, [class*="cross-ref"] a').each((_i, el) => {
      const text = $(el).text().trim();
      if (text && text.length >= 3 && text.length <= 60 && text.match(/^[A-Z0-9]/)) {
        refs.push({ oemNumber: text, type: "interchange" });
      }
    });
    return refs.length > 0 ? refs : undefined;
  }
}
