/**
 * Ovoko.fr crawler — Massive used auto parts marketplace.
 * 23M+ used parts from 4000+ junkyards/recyclers.
 *
 * Site structure:
 * - Category pages: /pieces-auto/{category}/
 * - Product pages: /piece/{id}
 * - Huge catalog from recyclers across Europe
 * - Parts listed with condition, photos, and donor vehicle info
 * - Structured data with JSON-LD on product pages
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

export class OvokoCrawler implements SiteCrawler {
  readonly siteId = "ovoko";
  readonly baseUrl = "https://www.ovoko.fr";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    const mainUrl = `${this.baseUrl}/pieces-auto/`;
    const result = await client.fetch(mainUrl);

    if (result.statusCode !== 200) return categories;

    const $ = cheerio.load(result.html);

    // Category hierarchy
    $('a[href*="/pieces-auto/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
        if (href === "/pieces-auto/" || href === `${this.baseUrl}/pieces-auto/`) return;
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    // Vehicle-based browsing (common for used parts)
    $('a[href*="/marque/"], a[href*="/voiture/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
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

    // Product cards
    $('[class*="product"] a[href], [class*="part-card"] a[href], [class*="result-item"] a[href]').each(
      (_i, el) => {
        const href = $(el).attr("href");
        if (!href || href === "#") return;

        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (links.some((l) => l.url === fullUrl)) return;

        const name =
          $(el).find('[class*="title"], [class*="name"], h2, h3').text().trim() ||
          $(el).text().trim();

        const oemEl = $(el)
          .closest('[class*="product"], [class*="part"], [class*="result"]')
          .find('[class*="ref"], [class*="oem"], [class*="part-number"]');
        const oemNumber = oemEl.text().trim() || undefined;

        if (name && name.length > 3) {
          links.push({ url: fullUrl, name, oemNumber });
        }
      },
    );

    // Fallback: piece links
    if (links.length === 0) {
      $('a[href*="/piece/"]').each((_i, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (links.some((l) => l.url === fullUrl)) return;
        const name = $(el).text().trim();
        if (name && name.length > 3) {
          links.push({ url: fullUrl, name });
        }
      });
    }

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

    // Try JSON-LD structured data first (Ovoko uses it)
    const jsonLd = this.extractJsonLd($);
    if (jsonLd) return { ...jsonLd, sourceUrl: pageUrl };

    // Fallback to HTML parsing
    const name = $('h1[itemprop="name"], h1[class*="product"], h1').first().text().trim();
    if (!name) return null;

    const oemNumber = this.extractOemNumber($);
    if (!oemNumber) return null;

    const brand = this.extractBrand($);
    const description =
      $('[itemprop="description"], [class*="description"]').first().text().trim() || undefined;

    const categoryPath = this.extractBreadcrumb($);
    const priceEur = this.extractPrice($);
    const imageUrls = this.extractImages($);
    const compatibleVehicles = this.extractCompatibility($);
    const crossReferences = this.extractCrossReferences($);
    const weightGrams = this.extractWeight($);
    const specifications = this.extractSpecifications($);

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
      specifications,
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

  /**
   * Extract product data from JSON-LD structured data (Product schema).
   */
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

        const brand =
          typeof data.brand === "string"
            ? data.brand
            : data.brand?.name;

        product = {
          name,
          oemNumber,
          brand,
          description: data.description || undefined,
          priceEur: data.offers?.price ? parseFloat(data.offers.price) : undefined,
          imageUrls: data.image
            ? Array.isArray(data.image)
              ? data.image
              : [data.image]
            : undefined,
        };
      } catch {
        // Invalid JSON-LD, skip
      }
    });

    return product;
  }

  private extractOemNumber($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="mpn"]',
      '[itemprop="sku"]',
      '[class*="part-number"]',
      '[class*="ref-oem"]',
      '[class*="reference"]',
    ];
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 3 && text.length <= 50) return text;
    }
    const refMatch = $("body")
      .text()
      .match(/(?:Réf\.|OEM|Part No\.|Référence)\s*[:.]?\s*([A-Z0-9][\w\-./]{2,30})/i);
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
      if (text && text !== "Accueil" && text.length < 80) breadcrumb.push(text);
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

    // Donor vehicle info (primary for used parts)
    $('[class*="donor"], [class*="vehicule"], [class*="compatible"]').each((_i, el) => {
      const text = $(el).text().trim();
      const match = text.match(/^(\w+)\s+(.+?)\s+(\d{4})(?:\s*[-–]\s*(\d{4}))?/);
      if (match) {
        vehicles.push({
          make: match[1],
          model: match[2].trim(),
          yearStart: parseInt(match[3], 10),
          yearEnd: match[4] ? parseInt(match[4], 10) : undefined,
        });
      }
    });

    // Structured compatibility
    $('[class*="compatibility"] tr, [class*="vehicle"] tr, [class*="fitment"] tr').each(
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
    $('[class*="cross-ref"] li, [class*="equivalent"] li, [class*="oem"] li, [class*="part-number"] li').each(
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

  private extractSpecifications($: cheerio.CheerioAPI): Record<string, string> | undefined {
    const specs: Record<string, string> = {};
    $('[class*="detail"] tr, [class*="specification"] tr').each((_i, el) => {
      const label = $(el).find("th, td:first-child").text().trim();
      const value = $(el).find("td:last-child").text().trim();
      if (label && value && label !== value) specs[label] = value;
    });

    // Condition
    const condition = $('[class*="condition"], [class*="etat"]').first().text().trim();
    if (condition) specs["Condition"] = condition;

    // Mileage
    const mileage = $('[class*="mileage"], [class*="kilometrage"]').first().text().trim();
    if (mileage) specs["Mileage"] = mileage;

    return Object.keys(specs).length > 0 ? specs : undefined;
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
