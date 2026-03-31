/**
 * SpareTo.com crawler — European spare parts marketplace.
 * Multi-country auto parts e-commerce platform.
 *
 * Site structure:
 * - Category pages: /car-parts/{category-slug}/
 * - Product pages: /product/{slug}
 * - Schema.org Product markup on product pages
 * - Vehicle fitment data available per product
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

export class SpareToCrawler implements SiteCrawler {
  readonly siteId = "spareto";
  readonly baseUrl = "https://www.spareto.com";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    const mainUrl = `${this.baseUrl}/car-parts/`;
    const result = await client.fetch(mainUrl);

    if (result.statusCode !== 200) return categories;

    const $ = cheerio.load(result.html);

    $('a[href*="/car-parts/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
        if (href === "/car-parts/" || href === `${this.baseUrl}/car-parts/`) return;
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

    // Try JSON-LD first
    const jsonLd = this.extractJsonLd($);
    if (jsonLd) {
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

    const name = $('h1[itemprop="name"], h1[class*="product"], h1').first().text().trim();
    if (!name) return null;

    const oemNumber = this.extractOemNumber($);
    if (!oemNumber) return null;

    return {
      sourceUrl: pageUrl,
      name,
      description:
        $('[itemprop="description"], [class*="description"]').first().text().trim() || undefined,
      oemNumber,
      brand: this.extractBrand($),
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

        product = {
          name,
          oemNumber,
          brand,
          description: data.description || undefined,
          priceEur: data.offers?.price ? parseFloat(data.offers.price) : undefined,
          imageUrls: data.image
            ? Array.isArray(data.image) ? data.image : [data.image]
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
      '[class*="reference"]',
    ];
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 3 && text.length <= 50) return text;
    }
    return undefined;
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
      if (!isNaN(val)) return val;
    }
    const priceText = $('[class*="price"]:not([class*="old"])').first().text().trim();
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
    $('[class*="cross-ref"] li, [class*="oem-number"] li, [class*="equivalent"] li').each(
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
