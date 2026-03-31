/**
 * Autodoc (auto-doc.fr) crawler — Europe's largest auto parts catalog by traffic.
 * ~6.7M products, 7M visits/month.
 *
 * Site structure:
 * - Category pages: /pieces-detachees/{slug} (paginated with ?page=N)
 * - Product pages: /pieces-detachees/{category}/{slug}/{id}
 * - Uses structured data (JSON-LD) extensively
 * - Heavy JavaScript rendering (requires ScraperAPI render mode)
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

export class AutodocCrawler implements SiteCrawler {
  readonly siteId = "autodoc";
  readonly baseUrl = "https://www.auto-doc.fr";

  async discoverCategories(config: CrawlConfig): Promise<CategoryLink[]> {
    const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
    const categories: CategoryLink[] = [];

    // Autodoc main parts categories
    const mainUrl = `${this.baseUrl}/pieces-detachees`;
    const result = await client.fetch(mainUrl, { render: true });

    if (result.statusCode !== 200) {
      return categories;
    }

    const $ = cheerio.load(result.html);

    // Autodoc category listing — typically grid of category cards
    $('a[href*="/pieces-detachees/"]').each((_i, el) => {
      const href = $(el).attr("href");
      const name = $(el).text().trim();
      if (
        href &&
        name &&
        name.length > 1 &&
        name.length < 100 &&
        // Skip the main category page itself
        href !== "/pieces-detachees" &&
        href !== "/pieces-detachees/"
      ) {
        const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
        if (!categories.some((c) => c.url === fullUrl)) {
          categories.push({ name, url: fullUrl });
        }
      }
    });

    // Also check navigation menu
    $('[class*="nav"] a[href*="/pieces-detachees/"], [class*="menu"] a[href*="/pieces-detachees/"]').each(
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

    // Autodoc product cards — look for product detail links
    $(
      '[class*="product"] a[href], [class*="listing"] a[href], [class*="item"] a[href]',
    ).each((_i, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      // Product URLs typically have a numeric ID at the end
      if (
        !href.match(/\/\d+$/) &&
        !href.includes("/p/") &&
        !href.includes("/produit/")
      ) {
        return;
      }

      const fullUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
      if (links.some((l) => l.url === fullUrl)) return;

      const name =
        $(el).find('[class*="title"], [class*="name"]').text().trim() ||
        $(el).text().trim();

      links.push({
        url: fullUrl,
        name: name || undefined,
      });
    });

    return links;
  }

  extractProduct(html: string, pageUrl: string): RawProduct | null {
    const $ = cheerio.load(html);

    // Try JSON-LD first (Autodoc often uses structured data)
    const product = this.extractFromJsonLd($, pageUrl);
    if (product) return product;

    // Fall back to HTML extraction
    const name =
      $('h1[itemprop="name"], h1[class*="product-title"], h1[class*="title"]')
        .first()
        .text()
        .trim() || $("h1").first().text().trim();

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
    };
  }

  getNextPageUrl(html: string, _currentUrl: string): string | null {
    const $ = cheerio.load(html);

    const nextLink = $(
      'a[rel="next"], [class*="next"] a, [class*="pagination"] a[aria-label*="Suivant"], [class*="pagination"] a[aria-label*="Next"]',
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
      // JSON-LD parsing failed, fall back
    }
    return null;
  }

  private extractOemNumber($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="mpn"]',
      '[itemprop="sku"]',
      '[class*="article-number"]',
      '[class*="ref-number"]',
      '[class*="part-number"]',
      '[data-article-number]',
    ];

    for (const sel of selectors) {
      const el = $(sel).first();
      const text = el.text().trim() || el.attr("content");
      if (text && text.length >= 3 && text.length <= 50) return text;
    }

    // Data attribute fallback
    const dataRef = $("[data-article-number]").first().attr("data-article-number");
    if (dataRef) return dataRef;

    return undefined;
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '[itemprop="brand"] [itemprop="name"]',
      '[itemprop="brand"]',
      '[class*="brand-name"]',
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

    $(
      '[class*="breadcrumb"] a, [itemtype*="BreadcrumbList"] a, ol[class*="breadcrumb"] li a',
    ).each((_i, el) => {
      const text = $(el).text().trim();
      if (text && text !== "Accueil" && text !== "Home" && text.length < 80) {
        breadcrumb.push(text);
      }
    });

    return breadcrumb.length > 0 ? breadcrumb : undefined;
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    const priceContent = $('[itemprop="price"]').attr("content");
    if (priceContent) return parseFloat(priceContent);

    const priceText = $(
      '[class*="price"]:not([class*="old"]):not([class*="original"])',
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
      '[class*="product"] img[src], [class*="gallery"] img[src], [itemprop="image"]',
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

    // Autodoc shows compatibility in table format
    $(
      '[class*="compatibility"] tr, [class*="application"] tr, [class*="vehicle-list"] tr',
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

    // Also check for vehicle chips/badges
    $('[class*="vehicle-tag"], [class*="car-link"]').each((_i, el) => {
      const text = $(el).text().trim();
      const parts = text.split(/\s+/);
      if (parts.length >= 2) {
        vehicles.push({
          make: parts[0],
          model: parts.slice(1).join(" "),
        });
      }
    });

    return vehicles.length > 0 ? vehicles : undefined;
  }

  private extractCrossReferences(
    $: cheerio.CheerioAPI,
  ): RawCrossReference[] | undefined {
    const refs: RawCrossReference[] = [];

    $(
      '[class*="cross-reference"] li, [class*="oe-number"] li, [class*="oem-number"] li, [class*="equivalent"] li',
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
}
