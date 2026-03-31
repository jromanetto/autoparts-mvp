/**
 * Opisto.fr crawler — French used/recycled auto parts catalog.
 * Sources parts from professional recyclers/breakers across France.
 *
 * Site structure:
 * - Category pages: /pieces/{category-slug}/
 * - Product pages: /piece/{reference}
 * - Used parts with condition grading
 * - Vehicle donor information (original vehicle the part came from)
 * - Recycler/seller information
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

export class OpistoCrawler implements SiteCrawler {
  readonly siteId = "opisto";
  readonly baseUrl = "https://www.opisto.fr";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    const mainUrl = `${this.baseUrl}/pieces/`;
    const result = await client.fetch(mainUrl);

    if (result.statusCode !== 200) return categories;

    const $ = cheerio.load(result.html);

    $('a[href*="/pieces/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
        if (href === "/pieces/" || href === `${this.baseUrl}/pieces/`) return;
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    // Used parts sites often organize by vehicle type first
    $('a[href*="/marque/"], a[href*="/vehicule/"]').each((_i, el) => {
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

    $('[class*="product"] a[href], [class*="piece"] a[href], [class*="result"] a[href]').each(
      (_i, el) => {
        const href = $(el).attr("href");
        if (!href || href === "#") return;

        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (links.some((l) => l.url === fullUrl)) return;

        const name =
          $(el).find('[class*="title"], [class*="name"], h2, h3').text().trim() ||
          $(el).text().trim();

        const oemEl = $(el)
          .closest('[class*="product"], [class*="piece"], [class*="result"]')
          .find('[class*="ref"], [class*="oem"]');
        const oemNumber = oemEl.text().trim() || undefined;

        if (name && name.length > 3) {
          links.push({ url: fullUrl, name, oemNumber });
        }
      },
    );

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

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

    // Used parts specifics: condition and donor vehicle info in specifications
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
      'a[rel="next"], [class*="next"] a, [class*="pagination"] a:contains("Suivant")',
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
      '[class*="oem-number"]',
    ];
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 3 && text.length <= 50) return text;
    }
    const refMatch = $("body")
      .text()
      .match(/(?:Réf\.|OEM|Référence|N° pièce)\s*[:.]?\s*([A-Z0-9][\w\-./]{2,30})/i);
    return refMatch?.[1];
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="brand"] [itemprop="name"]',
      '[itemprop="brand"]',
      '[class*="brand"]',
      '[class*="manufacturer"]',
      '[class*="constructeur"]',
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

    // Used parts: donor vehicle is the primary compatibility source
    $('[class*="donor"], [class*="vehicule-origine"], [class*="compatible"]').each((_i, el) => {
      const text = $(el).text().trim();
      // Try to parse "Make Model Year" pattern
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

    // Standard compatibility tables
    $('[class*="compatibility"] tr, [class*="vehicle"] tr').each((_i, el) => {
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
    });

    return vehicles.length > 0 ? vehicles : undefined;
  }

  private extractCrossReferences($: cheerio.CheerioAPI): RawCrossReference[] | undefined {
    const refs: RawCrossReference[] = [];
    $('[class*="cross-ref"] li, [class*="equivalent"] li, [class*="oem"] li').each((_i, el) => {
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

  private extractSpecifications($: cheerio.CheerioAPI): Record<string, string> | undefined {
    const specs: Record<string, string> = {};

    // Used parts: condition, mileage, color, side (left/right)
    $('[class*="detail"] tr, [class*="specification"] tr, [class*="characteristic"] tr').each(
      (_i, el) => {
        const label = $(el).find("th, td:first-child").text().trim();
        const value = $(el).find("td:last-child").text().trim();
        if (label && value && label !== value) specs[label] = value;
      },
    );

    // Condition grading
    const condition = $('[class*="condition"], [class*="etat"]').first().text().trim();
    if (condition) specs["Condition"] = condition;

    return Object.keys(specs).length > 0 ? specs : undefined;
  }

  private extractWeight($: cheerio.CheerioAPI): number | undefined {
    const weightText = $('[itemprop="weight"], [class*="weight"], [class*="poids"]').first().text().trim();
    if (!weightText) return undefined;
    const kgMatch = weightText.match(/([\d.]+)\s*kg/i);
    if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);
    const gMatch = weightText.match(/([\d.]+)\s*g(?:r)?/i);
    if (gMatch) return Math.round(parseFloat(gMatch[1]));
    return undefined;
  }
}
