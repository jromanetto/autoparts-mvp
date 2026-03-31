/**
 * FCP Euro crawler — European car parts specialist (US-based).
 * High-quality catalog focusing on European makes (BMW, VW, Audi, Mercedes, Volvo).
 *
 * Site structure:
 * - Category pages: /parts/{category-slug}
 * - Product pages: /product/{slug}
 * - Well-structured HTML with schema.org markup
 * - Detailed fitment/compatibility data
 * - Lifetime replacement guarantee (premium aftermarket)
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

export class FcpEuroCrawler implements SiteCrawler {
  readonly siteId = "fcpeuro";
  readonly baseUrl = "https://www.fcpeuro.com";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    const mainUrl = `${this.baseUrl}/parts`;
    const result = await client.fetch(mainUrl);

    if (result.statusCode !== 200) return categories;

    const $ = cheerio.load(result.html);

    $('a[href*="/parts/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
        if (href === "/parts" || href === "/parts/") return;
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    // Vehicle-specific browsing
    $('a[href*="/BMW/"], a[href*="/Volkswagen/"], a[href*="/Audi/"], a[href*="/Mercedes/"], a[href*="/Volvo/"]').each(
      (_i, el) => {
        const href = $(el).attr("href");
        const name = $(el).text().trim();
        if (href && name && name.length > 1 && name.length < 100) {
          const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
          if (!categories.some((c) => c.url === fullUrl)) {
            categories.push({ name, url: fullUrl });
          }
        }
      },
    );

    return categories;
  }

  extractProductLinks(html: string, _pageUrl: string): ProductLink[] {
    const $ = cheerio.load(html);
    const links: ProductLink[] = [];

    $('[class*="product"] a[href*="/product/"], a[href*="/product/"]').each((_i, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
      if (links.some((l) => l.url === fullUrl)) return;

      const name =
        $(el).find('[class*="title"], [class*="name"], h2, h3').text().trim() ||
        $(el).attr("title") || undefined;

      const oemEl = $(el)
        .closest('[class*="product"], [class*="card"]')
        .find('[class*="part-number"], [class*="sku"]');
      const oemNumber = oemEl.text().trim() || undefined;

      links.push({ url: fullUrl, name, oemNumber });
    });

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

    // Try JSON-LD first (FCP Euro uses schema.org well)
    const jsonLd = this.extractJsonLd($);
    if (jsonLd) {
      // Supplement with HTML-extracted data
      const compatibleVehicles = this.extractCompatibility($);
      const crossReferences = this.extractCrossReferences($);
      const categoryPath = this.extractBreadcrumb($);
      return {
        ...jsonLd,
        sourceUrl: pageUrl,
        compatibleVehicles: compatibleVehicles || jsonLd.compatibleVehicles,
        crossReferences: crossReferences || jsonLd.crossReferences,
        categoryPath: categoryPath || jsonLd.categoryPath,
      };
    }

    // Fallback HTML parsing
    const name = $('h1[itemprop="name"], h1[class*="product"], h1').first().text().trim();
    if (!name) return null;

    const oemNumber = this.extractOemNumber($);
    if (!oemNumber) return null;

    const brand = this.extractBrand($);
    const description =
      $('[itemprop="description"], [class*="description"]').first().text().trim() || undefined;

    return {
      sourceUrl: pageUrl,
      name,
      description,
      oemNumber,
      brand,
      categoryPath: this.extractBreadcrumb($),
      compatibleVehicles: this.extractCompatibility($),
      crossReferences: this.extractCrossReferences($),
      priceEur: this.extractPrice($),
      imageUrls: this.extractImages($),
      weightGrams: this.extractWeight($),
    };
  }

  getNextPageUrl(html: string, _currentUrl: string): string | null {
    const $ = cheerio.load(html);
    const nextLink = $(
      'a[rel="next"], [class*="next"] a, [class*="pagination"] a:contains("Next"), [class*="pagination"] a:contains("›")',
    ).first();
    const href = nextLink.attr("href");
    if (!href) return null;
    return href.startsWith("http") ? href : `${this.baseUrl}${href}`;
  }

  private extractJsonLd($: cheerio.CheerioAPI): Omit<RawProduct, "sourceUrl"> | null {
    let product: Omit<RawProduct, "sourceUrl"> | null = null;

    $('script[type="application/ld+json"]').each((_i, el) => {
      if (product) return;
      try {
        const data = JSON.parse($(el).html() || "");
        if (data["@type"] !== "Product") return;

        const name = data.name;
        const oemNumber = data.mpn || data.sku;
        if (!name || !oemNumber) return;

        const brand = typeof data.brand === "string" ? data.brand : data.brand?.name;

        // Convert USD price to EUR (approximate)
        let priceEur: number | undefined;
        if (data.offers?.price) {
          const usd = parseFloat(data.offers.price);
          if (!isNaN(usd)) priceEur = Math.round(usd * 0.92 * 100) / 100;
        }

        product = {
          name,
          oemNumber,
          brand,
          description: data.description || undefined,
          priceEur,
          imageUrls: data.image
            ? Array.isArray(data.image)
              ? data.image
              : [data.image]
            : undefined,
        };
      } catch {
        // Invalid JSON-LD
      }
    });

    return product;
  }

  private extractOemNumber($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="mpn"]',
      '[itemprop="sku"]',
      '[class*="part-number"]',
      '[class*="oe-number"]',
      '[class*="sku"]',
    ];
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 3 && text.length <= 50) return text;
    }
    const refMatch = $("body")
      .text()
      .match(/(?:Part #|OE #|MPN)\s*[:.]?\s*([A-Z0-9][\w\-./]{2,30})/i);
    return refMatch?.[1];
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="brand"] [itemprop="name"]',
      '[itemprop="brand"]',
      '[class*="brand"]',
      '[class*="manufacturer"]',
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
      if (text && text !== "Home" && text.length < 80) breadcrumb.push(text);
    });
    return breadcrumb.length > 0 ? breadcrumb : undefined;
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    const priceContent = $('[itemprop="price"]').attr("content");
    if (priceContent) {
      const val = parseFloat(priceContent);
      // Convert USD to EUR (approximate)
      if (!isNaN(val)) return Math.round(val * 0.92 * 100) / 100;
    }
    return undefined;
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

    // FCP Euro has detailed fitment tables
    $('[class*="fitment"] tr, [class*="compatibility"] tr, [class*="vehicle"] tr').each(
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
    $(
      '[class*="cross-ref"] li, [class*="interchange"] li, [class*="oe-number"] li, [class*="alternate"] li',
    ).each((_i, el) => {
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
    });
    return refs.length > 0 ? refs : undefined;
  }

  private extractWeight($: cheerio.CheerioAPI): number | undefined {
    const weightText = $('[itemprop="weight"], [class*="weight"]').first().text().trim();
    if (!weightText) return undefined;
    // Handle lbs (US site) → convert to grams
    const lbMatch = weightText.match(/([\d.]+)\s*(?:lb|lbs)/i);
    if (lbMatch) return Math.round(parseFloat(lbMatch[1]) * 453.592);
    const kgMatch = weightText.match(/([\d.]+)\s*kg/i);
    if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);
    const gMatch = weightText.match(/([\d.]+)\s*g(?:r)?/i);
    if (gMatch) return Math.round(parseFloat(gMatch[1]));
    return undefined;
  }
}
