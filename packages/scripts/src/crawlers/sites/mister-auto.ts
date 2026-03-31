/**
 * Mister-Auto (mister-auto.com) crawler — Stellantis group, 50+ brands.
 * ~2.5M visits/month.
 *
 * Site structure:
 * - Category pages: /pieces-auto/{slug}/ (paginated)
 * - Product pages: /p/{sku}/{slug}.html
 * - Uses microdata and some JSON-LD
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

export class MisterAutoCrawler implements SiteCrawler {
  readonly siteId = "mister-auto";
  readonly baseUrl = "https://www.mister-auto.com";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    // Mister-Auto main parts listing
    const mainUrl = `${this.baseUrl}/pieces-auto/`;
    const result = await client.fetch(mainUrl, { render: true });

    if (result.statusCode !== 200) {
      return categories;
    }

    const $ = cheerio.load(result.html);

    // Mister-Auto category links
    $('a[href*="/pieces-auto/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (
        href &&
        name &&
        name.length > 1 &&
        name.length < 100 &&
        href !== "/pieces-auto/" &&
        // Skip vehicle-specific pages
        !href.includes("/vehicule/") &&
        !href.includes("/voiture/")
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

    // Mister-Auto product cards
    $('a[href*="/p/"], [class*="product"] a[href], [class*="listing-item"] a[href]').each(
      (_i, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (links.some((l) => l.url === fullUrl)) return;

        // Skip clearly non-product links
        if (href.includes("/pieces-auto/") && !href.includes("/p/")) return;

        const name =
          $(el).find('[class*="title"], [class*="name"], h2, h3').text().trim() ||
          $(el).attr("title") ||
          $(el).text().trim();

        links.push({
          url: fullUrl,
          name: name || undefined,
        });
      },
    );

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

    // Try JSON-LD first
    const jsonLdProduct = this.extractFromJsonLd($, pageUrl);
    if (jsonLdProduct) return jsonLdProduct;

    // HTML extraction
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
      'a[rel="next"], [class*="pagination"] a[class*="next"], [class*="pager"] a:last-child',
    ).first();

    const href = nextLink.attr("href");
    if (!href) return null;

    return href.startsWith("http") ? href : `${this.baseUrl}${href}`;
  }

  // --- Private helpers ---

  private extractFromJsonLd(
    $: cheerio.CheerioAPI,
    pageUrl: string,
  ): RawProduct | null {
    try {
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const text = $(scripts[i]).html();
        if (!text) continue;

        const data = JSON.parse(text);
        if (data["@type"] === "Product" && data.name) {
          return {
            sourceUrl: pageUrl,
            name: data.name,
            description: data.description,
            oemNumber: data.mpn || data.sku,
            brand: data.brand?.name,
            priceEur: data.offers?.price
              ? parseFloat(data.offers.price)
              : undefined,
            imageUrls: data.image
              ? Array.isArray(data.image)
                ? data.image
                : [data.image]
              : undefined,
            categoryPath: this.extractBreadcrumb($) ?? undefined,
            compatibleVehicles: this.extractCompatibility($) ?? undefined,
            crossReferences: this.extractCrossReferences($) ?? undefined,
          };
        }
      }
    } catch {
      // JSON-LD parsing failed
    }
    return null;
  }

  private extractOemNumber($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="mpn"]',
      '[itemprop="sku"]',
      '[class*="reference"]',
      '[class*="part-number"]',
      '[class*="article"]',
    ];

    for (const sel of selectors) {
      const el = $(sel).first();
      const text = el.text().trim() || el.attr("content");
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
      const el = $(sel).first();
      const text = el.text().trim() || el.attr("content");
      if (text && text.length >= 2 && text.length <= 50) return text;
    }

    return undefined;
  }

  private extractBreadcrumb($: cheerio.CheerioAPI): string[] | undefined {
    const breadcrumb: string[] = [];

    $('[class*="breadcrumb"] a, [itemtype*="BreadcrumbList"] a').each(
      (_i, el) => {
        const text = $(el).text().trim();
        if (text && text !== "Accueil" && text !== "Home" && text.length < 80) {
          breadcrumb.push(text);
        }
      },
    );

    return breadcrumb.length > 0 ? breadcrumb : undefined;
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    const priceContent = $('[itemprop="price"]').attr("content");
    if (priceContent) return parseFloat(priceContent);

    const priceText = $(
      '[class*="price"]:not([class*="old"]):not([class*="barred"])',
    )
      .first()
      .text()
      .trim();

    if (!priceText) return undefined;
    const match = priceText.replace(/\s/g, "").match(/([\d]+[.,][\d]{2})/);
    return match ? parseFloat(match[1].replace(",", ".")) : undefined;
  }

  private extractImages($: cheerio.CheerioAPI): string[] | undefined {
    const images: string[] = [];

    $(
      '[class*="product-image"] img, [class*="gallery"] img, [itemprop="image"]',
    ).each((_i, el) => {
      const src =
        $(el).attr("src") || $(el).attr("data-src") || $(el).attr("content");
      if (src && !src.includes("placeholder") && !src.includes("logo")) {
        const fullUrl = src.startsWith("http") ? src : `${this.baseUrl}${src}`;
        if (!images.includes(fullUrl)) images.push(fullUrl);
      }
    });

    return images.length > 0 ? images : undefined;
  }

  private extractCompatibility(
    $: cheerio.CheerioAPI,
  ): RawVehicleCompatibility[] | undefined {
    const vehicles: RawVehicleCompatibility[] = [];

    $(
      '[class*="compatibility"] tr, [class*="vehicle"] tr, [class*="fitment"] tr',
    ).each((_i, el) => {
      const cells = $(el).find("td");
      if (cells.length >= 2) {
        const make = cells.eq(0).text().trim();
        const model = cells.eq(1).text().trim();

        if (make && model) {
          const vehicle: RawVehicleCompatibility = { make, model };

          if (cells.length >= 3) {
            const yearText = cells.eq(2).text().trim();
            const yearMatch = yearText.match(/(\d{4})/);
            if (yearMatch) vehicle.yearStart = parseInt(yearMatch[1], 10);
            const yearEndMatch = yearText.match(/[-–]\s*(\d{4})/);
            if (yearEndMatch)
              vehicle.yearEnd = parseInt(yearEndMatch[1], 10);
          }

          if (cells.length >= 4) {
            vehicle.engineCode = cells.eq(3).text().trim() || undefined;
          }

          vehicles.push(vehicle);
        }
      }
    });

    return vehicles.length > 0 ? vehicles : undefined;
  }

  private extractCrossReferences(
    $: cheerio.CheerioAPI,
  ): RawCrossReference[] | undefined {
    const refs: RawCrossReference[] = [];

    $(
      '[class*="cross-ref"] li, [class*="equivalent"] li, [class*="oem"] li',
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
    const weightText = $('[itemprop="weight"], [class*="weight"]')
      .first()
      .text()
      .trim();

    if (!weightText) return undefined;

    const kgMatch = weightText.match(/([\d.]+)\s*kg/i);
    if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);

    const gMatch = weightText.match(/([\d.]+)\s*g(?:r)?/i);
    if (gMatch) return Math.round(parseFloat(gMatch[1]));

    return undefined;
  }
}
