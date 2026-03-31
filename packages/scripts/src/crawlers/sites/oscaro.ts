/**
 * Oscaro.com crawler — France's leading auto parts e-commerce site.
 * ~1M+ references, 5.6M visits/month.
 *
 * Site structure:
 * - Category pages: /cat/{slug}-{id}.html (paginated with ?page=N)
 * - Product pages: /p/{slug}-{id}.html
 * - Product listings show product cards with OEM numbers and brands
 * - Product detail pages have compatibility tables and cross-references
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

export class OscaroCrawler implements SiteCrawler {
  readonly siteId = "oscaro";
  readonly baseUrl = "https://www.oscaro.com";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    // Oscaro main auto parts categories page
    const mainUrl = `${this.baseUrl}/fr/categorie`;
    const result = await client.fetch(mainUrl, { render: true });

    if (result.statusCode !== 200) {
      return categories;
    }

    const $ = cheerio.load(result.html);

    // Oscaro uses category cards/links on their main category page
    // Look for category links in navigation and category listing areas
    $('a[href*="/cat/"], a[href*="/categorie/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (href && name && name.length > 1 && name.length < 100) {
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        // Avoid duplicates
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    // Also look for structured navigation menus
    $('[class*="category"], [class*="menu"] a, nav a').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (
        href &&
        name &&
        name.length > 1 &&
        name.length < 100 &&
        (href.includes("/cat/") || href.includes("/categorie/"))
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

    // Oscaro product cards in listing pages
    // Look for product links — typical patterns: /p/{slug}-{id}.html or /produit/
    $('a[href*="/p/"], a[href*="/produit/"]').each((_i, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;

      // Avoid duplicates and non-product links
      if (links.some((l) => l.url === fullUrl)) return;

      const name = $(el).text().trim() ||
        $(el).find('[class*="title"], [class*="name"], h2, h3').text().trim();

      // Try to extract OEM number from the card
      const oemEl = $(el)
        .closest('[class*="product"], [class*="card"]')
        .find('[class*="ref"], [class*="oem"], [class*="ean"]');
      const oemNumber = oemEl.text().trim() || undefined;

      links.push({
        url: fullUrl,
        name: name || undefined,
        oemNumber,
      });
    });

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

    // Product name
    const name =
      $('h1[class*="product"], h1[class*="title"], [itemprop="name"]')
        .first()
        .text()
        .trim() || $("h1").first().text().trim();

    if (!name) return null;

    // OEM / Reference number
    const oemNumber = this.extractOemNumber($);
    if (!oemNumber) return null;

    // Brand / Manufacturer
    const brand = this.extractBrand($);

    // Description
    const description =
      $('[itemprop="description"], [class*="description"]')
        .first()
        .text()
        .trim() || undefined;

    // Category breadcrumb
    const categoryPath = this.extractBreadcrumb($);

    // Price
    const priceEur = this.extractPrice($);

    // Images
    const imageUrls = this.extractImages($);

    // Compatible vehicles
    const compatibleVehicles = this.extractCompatibility($);

    // Cross-references
    const crossReferences = this.extractCrossReferences($);

    // Weight
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

    // Look for next page link
    const nextLink =
      $('a[rel="next"], [class*="next"] a, [class*="pagination"] a:contains("Suivant"), [class*="pagination"] a:contains("›")').first();

    const href = nextLink.attr("href");
    if (!href) return null;

    return href.startsWith("http") ? href : `${this.baseUrl}${href}`;
  }

  // --- Private extraction helpers ---

  private extractOemNumber($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for reference numbers
    const selectors = [
      '[class*="reference"] [class*="value"]',
      '[class*="ref-number"]',
      '[itemprop="sku"]',
      '[itemprop="mpn"]',
      '[class*="oem"]',
      '[data-ref]',
    ];

    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length >= 3 && text.length <= 50) return text;
    }

    // Try to find reference in text content
    const refMatch = $("body")
      .text()
      .match(/(?:Réf\.|Ref\.|N°|Référence)\s*[:.]?\s*([A-Z0-9][\w\-./]{2,30})/i);
    return refMatch?.[1];
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="brand"] [itemprop="name"]',
      '[itemprop="brand"]',
      '[class*="brand"] [class*="name"]',
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

    $('[class*="breadcrumb"] a, [itemtype*="BreadcrumbList"] a, nav[aria-label*="Breadcrumb"] a, nav[aria-label*="breadcrumb"] a').each(
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
    const priceText =
      $('[itemprop="price"]').attr("content") ||
      $('[class*="price"]:not([class*="old"]):not([class*="crossed"])').first().text().trim();

    if (!priceText) return undefined;

    const match = priceText.replace(/\s/g, "").match(/([\d]+[.,][\d]{2})/);
    if (match) {
      return parseFloat(match[1].replace(",", "."));
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

    // Oscaro typically shows compatibility as a table or list
    $('[class*="compatibility"] tr, [class*="vehicle"] tr, [class*="application"] tr').each(
      (_i, el) => {
        const cells = $(el).find("td");
        if (cells.length >= 2) {
          const make = cells.eq(0).text().trim();
          const model = cells.eq(1).text().trim();
          const yearText = cells.eq(2)?.text().trim();

          if (make && model) {
            const vehicle: RawVehicleCompatibility = { make, model };

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

    // Also look for vehicle badges/chips
    $('[class*="vehicle-badge"], [class*="vehicle-chip"], [class*="compatible-vehicle"]').each(
      (_i, el) => {
        const text = $(el).text().trim();
        const parts = text.split(/\s+/);
        if (parts.length >= 2) {
          vehicles.push({
            make: parts[0],
            model: parts.slice(1).join(" "),
          });
        }
      },
    );

    return vehicles.length > 0 ? vehicles : undefined;
  }

  private extractCrossReferences($: cheerio.CheerioAPI): RawCrossReference[] | undefined {
    const refs: RawCrossReference[] = [];

    // Look for cross-reference / equivalent numbers sections
    $('[class*="cross-ref"] li, [class*="equivalent"] li, [class*="oem-number"] li, [class*="reference"] li').each(
      (_i, el) => {
        const text = $(el).text().trim();
        if (text && text.length >= 3 && text.length <= 60) {
          // Try to split "Brand: Number" or just "Number"
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
