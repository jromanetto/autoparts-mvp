/**
 * PiecesAuto.fr crawler — French auto parts site specializing in OEM number search.
 *
 * Site structure:
 * - Category pages: /pieces-auto/{category-slug}/
 * - Product pages: /pieces-auto/{category}/{product-slug}.html
 * - Strong OEM reference focus — parts indexed by manufacturer reference
 * - Vehicle compatibility tables on product pages
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

export class PiecesAutoCrawler implements SiteCrawler {
  readonly siteId = "piecesauto";
  readonly baseUrl = "https://www.piecesauto.fr";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    const mainUrl = `${this.baseUrl}/pieces-auto/`;
    const result = await client.fetch(mainUrl);

    if (result.statusCode !== 200) return categories;

    const $ = cheerio.load(result.html);

    // Category links in navigation and listing areas
    $('a[href*="/pieces-auto/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
        // Skip links back to main category index
        if (href === "/pieces-auto/" || href === `${this.baseUrl}/pieces-auto/`) return;
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    // Structured navigation menus
    $('[class*="categor"] a, [class*="menu-categor"] a').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (
        href &&
        name &&
        name.length > 1 &&
        name.length < 100 &&
        href.includes("/pieces-auto/")
      ) {
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    return categories;
  }

  extractProductLinks(html: string, _pageUrl: string): ProductLink[] {
    const $ = cheerio.load(html);
    const links: ProductLink[] = [];

    // Product cards in listing pages
    $('[class*="product"] a[href], [class*="article"] a[href]').each((_i, el) => {
      const href = $(el).attr("href");
      if (!href || !href.includes(".html")) return;

      const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
      if (links.some((l) => l.url === fullUrl)) return;

      const name =
        $(el).find('[class*="title"], [class*="name"], h2, h3').text().trim() ||
        $(el).text().trim();

      // OEM number from product card
      const oemEl = $(el)
        .closest('[class*="product"], [class*="article"]')
        .find('[class*="ref"], [class*="oem"]');
      const oemNumber = oemEl.text().trim() || undefined;

      links.push({ url: fullUrl, name: name || undefined, oemNumber });
    });

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

    const name =
      $('h1[itemprop="name"], h1[class*="product"], h1').first().text().trim();
    if (!name) return null;

    const oemNumber = this.extractOemNumber($);
    if (!oemNumber) return null;

    const brand = this.extractBrand($);

    const description =
      $('[itemprop="description"], [class*="description"]')
        .first()
        .text()
        .trim() || undefined;

    const categoryPath = this.extractBreadcrumb($);
    const priceEur = this.extractPrice($);
    const imageUrls = this.extractImages($);
    const compatibleVehicles = this.extractCompatibility($);
    const crossReferences = this.extractCrossReferences($);
    const weightGrams = this.extractWeight($);

    return {
      sourceUrl: pageUrl,
      name,
      description,
      oemNumber,
      brand,
      categoryPath,
      compatibleVehicles,
      crossReferences,
      priceEur,
      imageUrls,
      weightGrams,
    };
  }

  getNextPageUrl(html: string, _currentUrl: string): string | null {
    const $ = cheerio.load(html);
    const nextLink = $(
      'a[rel="next"], [class*="next"] a, [class*="pagination"] a:contains("Suivant"), [class*="pagination"] a:contains("›")',
    ).first();

    const href = nextLink.attr("href");
    if (!href) return null;

    return href.startsWith("http") ? href : `${this.baseUrl}${href}`;
  }

  private extractOemNumber($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="mpn"]',
      '[itemprop="sku"]',
      '[class*="ref-oem"]',
      '[class*="reference"]',
      '[class*="ref-number"]',
      '[data-oem]',
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 3 && text.length <= 50) return text;
    }

    const refMatch = $("body")
      .text()
      .match(/(?:Réf\.|Ref\.|OEM|Référence)\s*[:.]?\s*([A-Z0-9][\w\-./]{2,30})/i);
    return refMatch?.[1];
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="brand"] [itemprop="name"]',
      '[itemprop="brand"]',
      '[class*="brand"]',
      '[class*="manufacturer"]',
      '[class*="marque"]',
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 2 && text.length <= 50) return text;
    }
    return undefined;
  }

  private extractBreadcrumb($: cheerio.CheerioAPI): string[] | undefined {
    const breadcrumb: string[] = [];
    $('[class*="breadcrumb"] a, [itemtype*="BreadcrumbList"] a').each((_i, el) => {
      const text = $(el).text().trim();
      if (text && text !== "Accueil" && text !== "Home" && text.length < 80) {
        breadcrumb.push(text);
      }
    });
    return breadcrumb.length > 0 ? breadcrumb : undefined;
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    const priceText =
      $('[itemprop="price"]').attr("content") ||
      $('[class*="price"]:not([class*="old"])').first().text().trim();
    if (!priceText) return undefined;
    const match = priceText.replace(/\s/g, "").match(/([\d]+[.,][\d]{2})/);
    return match ? parseFloat(match[1].replace(",", ".")) : undefined;
  }

  private extractImages($: cheerio.CheerioAPI): string[] | undefined {
    const images: string[] = [];
    $('[class*="product"] img[src], [class*="gallery"] img[src], [itemprop="image"]').each(
      (_i, el) => {
        const src = $(el).attr("src") || $(el).attr("content");
        if (src && !src.includes("placeholder") && !src.includes("logo")) {
          const fullUrl = src.startsWith("http") ? src : `${this.baseUrl}${src}`;
          if (!images.includes(fullUrl)) images.push(fullUrl);
        }
      },
    );
    return images.length > 0 ? images : undefined;
  }

  private extractCompatibility($: cheerio.CheerioAPI): RawVehicleCompatibility[] | undefined {
    const vehicles: RawVehicleCompatibility[] = [];

    // Compatibility tables (common on French parts sites)
    $('[class*="compatibility"] tr, [class*="vehicle"] tr, [class*="application"] tr').each(
      (_i, el) => {
        const cells = $(el).find("td");
        if (cells.length >= 2) {
          const make = cells.eq(0).text().trim();
          const model = cells.eq(1).text().trim();
          if (make && model) {
            const vehicle: RawVehicleCompatibility = { make, model };
            const yearText = cells.eq(2)?.text().trim();
            if (yearText) {
              const yearMatch = yearText.match(/(\d{4})/);
              if (yearMatch) vehicle.yearStart = parseInt(yearMatch[1], 10);
              const yearEndMatch = yearText.match(/[-–]\s*(\d{4})/);
              if (yearEndMatch) vehicle.yearEnd = parseInt(yearEndMatch[1], 10);
            }
            if (cells.length >= 4) {
              const engine = cells.eq(3).text().trim();
              if (engine) vehicle.engineCode = engine;
            }
            vehicles.push(vehicle);
          }
        }
      },
    );

    return vehicles.length > 0 ? vehicles : undefined;
  }

  private extractCrossReferences($: cheerio.CheerioAPI): RawCrossReference[] | undefined {
    const refs: RawCrossReference[] = [];
    $('[class*="cross-ref"] li, [class*="equivalent"] li, [class*="oem-ref"] li').each(
      (_i, el) => {
        const text = $(el).text().trim();
        if (text && text.length >= 3 && text.length <= 60) {
          const colonMatch = text.match(/^(.+?)\s*[:–-]\s*(.+)$/);
          if (colonMatch) {
            refs.push({
              oemNumber: colonMatch[2].trim(),
              manufacturer: colonMatch[1].trim(),
              type: "equivalent",
            });
          } else {
            refs.push({ oemNumber: text, type: "equivalent" });
          }
        }
      },
    );
    return refs.length > 0 ? refs : undefined;
  }

  private extractWeight($: cheerio.CheerioAPI): number | undefined {
    const weightText = $('[itemprop="weight"], [class*="weight"]').first().text().trim();
    if (!weightText) return undefined;
    const kgMatch = weightText.match(/([\d.]+)\s*kg/i);
    if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);
    const gMatch = weightText.match(/([\d.]+)\s*g(?:r)?/i);
    if (gMatch) return Math.round(parseFloat(gMatch[1]));
    return undefined;
  }
}
