/**
 * DistriAuto.fr crawler — TecDoc-based French auto parts distributor.
 * Uses TecDoc standard catalog numbers for vehicle-part compatibility.
 *
 * Site structure:
 * - Category pages: /catalogue/{category-slug}/
 * - Product pages: /produit/{brand}/{reference}
 * - TecDoc KType-based vehicle compatibility
 * - Strong cross-reference data from TecDoc database
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

export class DistriAutoCrawler implements SiteCrawler {
  readonly siteId = "distriauto";
  readonly baseUrl = "https://www.distriauto.fr";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    const mainUrl = `${this.baseUrl}/catalogue/`;
    const result = await client.fetch(mainUrl);

    if (result.statusCode !== 200) return categories;

    const $ = cheerio.load(result.html);

    // TecDoc-based sites use structured category trees
    $('a[href*="/catalogue/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
        if (href === "/catalogue/" || href === `${this.baseUrl}/catalogue/`) return;
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    // Also look for TecDoc generic article groups
    $('[class*="tecdoc"] a, [class*="group"] a').each((_i, el) => {
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

    $('[class*="product"] a[href*="/produit/"], a[href*="/produit/"]').each((_i, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
      if (links.some((l) => l.url === fullUrl)) return;

      const name =
        $(el).find('[class*="title"], h2, h3').text().trim() ||
        $(el).text().trim();

      const oemEl = $(el)
        .closest('[class*="product"], [class*="card"]')
        .find('[class*="ref"], [class*="article-number"]');
      const oemNumber = oemEl.text().trim() || undefined;

      links.push({ url: fullUrl, name: name || undefined, oemNumber });
    });

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

    // TecDoc-specific: extract specifications from structured data
    const specifications = this.extractSpecifications($);
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
      '[class*="article-number"]',
      '[class*="tecdoc-ref"]',
      '[class*="oem"]',
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

    // TecDoc-based compatibility tables are structured
    $('[class*="compatibility"] tr, [class*="vehicle"] tr, [class*="linkage"] tr').each(
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
            // TecDoc KType number
            const ktypeCell = $(el).find('[data-ktype], [class*="ktype"]');
            if (ktypeCell.length > 0) {
              vehicle.fitmentNotes = `KType: ${ktypeCell.text().trim()}`;
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

    // TecDoc provides rich OE number cross-references
    $('[class*="oe-number"] li, [class*="cross-ref"] li, [class*="oem-ref"] li').each(
      (_i, el) => {
        const text = $(el).text().trim();
        if (text && text.length >= 3 && text.length <= 60) {
          const colonMatch = text.match(/^(.+?)\s*[:–-]\s*(.+)$/);
          if (colonMatch) {
            refs.push({
              oemNumber: colonMatch[2].trim(),
              manufacturer: colonMatch[1].trim(),
              type: "oe_equivalent",
            });
          } else {
            refs.push({ oemNumber: text, type: "oe_equivalent" });
          }
        }
      },
    );

    return refs.length > 0 ? refs : undefined;
  }

  private extractSpecifications($: cheerio.CheerioAPI): Record<string, string> | undefined {
    const specs: Record<string, string> = {};

    // TecDoc specifications are typically in definition lists or tables
    $('[class*="specification"] tr, [class*="detail"] tr, [class*="criteria"] tr').each(
      (_i, el) => {
        const label = $(el).find("th, td:first-child").text().trim();
        const value = $(el).find("td:last-child").text().trim();
        if (label && value && label !== value) {
          specs[label] = value;
        }
      },
    );

    $('[class*="specification"] dt, [class*="detail"] dt').each((_i, el) => {
      const label = $(el).text().trim();
      const value = $(el).next("dd").text().trim();
      if (label && value) specs[label] = value;
    });

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
