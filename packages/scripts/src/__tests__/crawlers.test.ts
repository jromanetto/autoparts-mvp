import { describe, it, expect } from "vitest";
import { OscaroCrawler } from "../crawlers/sites/oscaro.js";
import { AutodocCrawler } from "../crawlers/sites/autodoc.js";
import { MisterAutoCrawler } from "../crawlers/sites/mister-auto.js";
import { getCrawler, listCrawlers } from "../crawlers/sites/index.js";

// --- HTML Fixtures ---

const oscaroListingHtml = `
<html>
<body>
  <div class="product-list">
    <div class="product-card">
      <a href="/p/bosch-brake-pad-12345.html">
        <h3 class="product-title">Bosch Front Brake Pad Set</h3>
        <span class="ref-number">0986494524</span>
      </a>
    </div>
    <div class="product-card">
      <a href="/p/trw-brake-disc-67890.html">
        <h3 class="product-title">TRW Brake Disc</h3>
      </a>
    </div>
  </div>
  <div class="pagination">
    <a href="/cat/freinage-100.html?page=1" class="active">1</a>
    <a href="/cat/freinage-100.html?page=2">2</a>
    <a rel="next" href="/cat/freinage-100.html?page=2">Suivant ›</a>
  </div>
</body>
</html>
`;

const oscaroProductHtml = `
<html>
<head>
  <script type="application/ld+json">
    {"@type": "BreadcrumbList", "itemListElement": []}
  </script>
</head>
<body>
  <nav aria-label="Breadcrumb">
    <a href="/">Accueil</a>
    <a href="/cat/freinage">Freinage</a>
    <a href="/cat/plaquettes-frein">Plaquettes de frein</a>
  </nav>
  <h1 itemprop="name">Bosch Front Brake Pad Set</h1>
  <div class="reference">
    <span class="value">0986494524</span>
  </div>
  <span itemprop="brand"><span itemprop="name">Bosch</span></span>
  <div itemprop="description">Low-dust ceramic brake pads for European vehicles</div>
  <meta itemprop="price" content="45.99" />
  <span itemprop="weight">450 g</span>
  <div class="product-gallery">
    <img src="https://images.oscaro.com/brake-pad.jpg" />
  </div>
  <table class="compatibility-table">
    <tr><td>Volkswagen</td><td>Golf VII</td><td>2012 – 2019</td><td>CJSA</td></tr>
    <tr><td>Audi</td><td>A3 8V</td><td>2013 – 2020</td><td>CZEA</td></tr>
  </table>
  <ul class="cross-ref-list">
    <li>TRW: GDB1550</li>
    <li>ATE: 13.0460-7265.2</li>
  </ul>
</body>
</html>
`;

const autodocProductJsonLd = `
<html>
<head>
  <script type="application/ld+json">
  {
    "@type": "Product",
    "name": "MANN-FILTER Oil Filter W 712/94",
    "description": "Oil filter for VAG EA211 engines",
    "mpn": "W712/94",
    "sku": "W712-94",
    "brand": { "@type": "Brand", "name": "Mann-Filter" },
    "offers": { "@type": "Offer", "price": "8.99", "priceCurrency": "EUR" },
    "image": ["https://images.autodoc.fr/filter.jpg"]
  }
  </script>
</head>
<body>
  <ol class="breadcrumb">
    <li><a href="/">Accueil</a></li>
    <li><a href="/pieces-detachees/filtres">Filtres</a></li>
    <li><a href="/pieces-detachees/filtres/huile">Filtre à huile</a></li>
  </ol>
  <div class="vehicle-list">
    <table>
      <tr><td>Volkswagen</td><td>Polo V</td><td>2014 – 2021</td><td>CWVA</td></tr>
    </table>
  </div>
</body>
</html>
`;

const misterAutoListingHtml = `
<html>
<body>
  <div class="listing-items">
    <div class="listing-item">
      <a href="/p/MA001/bosch-bougie.html">
        <span class="title">Bosch Spark Plug</span>
      </a>
    </div>
  </div>
  <div class="pagination">
    <a href="/pieces-auto/bougies/?page=2" class="next">Suivant</a>
  </div>
</body>
</html>
`;

// --- Tests ---

describe("Crawler Registry", () => {
  it("lists all available crawlers", () => {
    const crawlers = listCrawlers();
    expect(crawlers).toContain("oscaro");
    expect(crawlers).toContain("autodoc");
    expect(crawlers).toContain("mister-auto");
  });

  it("creates crawler by site ID", () => {
    const crawler = getCrawler("oscaro");
    expect(crawler.siteId).toBe("oscaro");
    expect(crawler.baseUrl).toBe("https://www.oscaro.com");
  });

  it("throws for unknown site ID", () => {
    expect(() => getCrawler("unknown-site")).toThrow(/Unknown site/);
  });
});

describe("OscaroCrawler", () => {
  const crawler = new OscaroCrawler();

  it("has correct site ID and base URL", () => {
    expect(crawler.siteId).toBe("oscaro");
    expect(crawler.baseUrl).toBe("https://www.oscaro.com");
  });

  it("extracts product links from listing page", () => {
    const links = crawler.extractProductLinks(oscaroListingHtml, "https://www.oscaro.com/cat/freinage");
    expect(links.length).toBeGreaterThanOrEqual(2);

    const boschLink = links.find((l) => l.url.includes("brake-pad"));
    expect(boschLink).toBeDefined();
    expect(boschLink!.url).toBe("https://www.oscaro.com/p/bosch-brake-pad-12345.html");
  });

  it("extracts next page URL", () => {
    const nextUrl = crawler.getNextPageUrl(oscaroListingHtml, "https://www.oscaro.com/cat/freinage-100.html");
    expect(nextUrl).toBe("https://www.oscaro.com/cat/freinage-100.html?page=2");
  });

  it("returns null when no next page", () => {
    const html = "<html><body><div class='pagination'><span>1</span></div></body></html>";
    const nextUrl = crawler.getNextPageUrl(html, "https://www.oscaro.com/cat/test");
    expect(nextUrl).toBeNull();
  });

  it("extracts full product from detail page", () => {
    const product = crawler.extractProduct(oscaroProductHtml, "https://www.oscaro.com/p/test");
    expect(product).not.toBeNull();
    expect(product!.name).toBe("Bosch Front Brake Pad Set");
    expect(product!.oemNumber).toBe("0986494524");
    expect(product!.brand).toBe("Bosch");
    expect(product!.priceEur).toBe(45.99);
    expect(product!.weightGrams).toBe(450);
  });

  it("extracts breadcrumb categories", () => {
    const product = crawler.extractProduct(oscaroProductHtml, "https://www.oscaro.com/p/test");
    expect(product!.categoryPath).toEqual(["Freinage", "Plaquettes de frein"]);
  });

  it("extracts compatible vehicles", () => {
    const product = crawler.extractProduct(oscaroProductHtml, "https://www.oscaro.com/p/test");
    expect(product!.compatibleVehicles).toHaveLength(2);
    expect(product!.compatibleVehicles![0]).toMatchObject({
      make: "Volkswagen",
      model: "Golf VII",
      yearStart: 2012,
      yearEnd: 2019,
      engineCode: "CJSA",
    });
  });

  it("extracts cross-references", () => {
    const product = crawler.extractProduct(oscaroProductHtml, "https://www.oscaro.com/p/test");
    expect(product!.crossReferences).toHaveLength(2);
    expect(product!.crossReferences![0]).toMatchObject({
      oemNumber: "GDB1550",
      manufacturer: "TRW",
      type: "equivalent",
    });
  });

  it("extracts product images", () => {
    const product = crawler.extractProduct(oscaroProductHtml, "https://www.oscaro.com/p/test");
    expect(product!.imageUrls).toHaveLength(1);
    expect(product!.imageUrls![0]).toBe("https://images.oscaro.com/brake-pad.jpg");
  });

  it("returns null for empty product page", () => {
    const product = crawler.extractProduct("<html><body></body></html>", "https://test.com");
    expect(product).toBeNull();
  });
});

describe("AutodocCrawler", () => {
  const crawler = new AutodocCrawler();

  it("has correct site ID and base URL", () => {
    expect(crawler.siteId).toBe("autodoc");
    expect(crawler.baseUrl).toBe("https://www.auto-doc.fr");
  });

  it("extracts product from JSON-LD", () => {
    const product = crawler.extractProduct(autodocProductJsonLd, "https://www.auto-doc.fr/p/test");
    expect(product).not.toBeNull();
    expect(product!.name).toBe("MANN-FILTER Oil Filter W 712/94");
    expect(product!.oemNumber).toBe("W712/94");
    expect(product!.brand).toBe("Mann-Filter");
    expect(product!.priceEur).toBe(8.99);
    expect(product!.description).toBe("Oil filter for VAG EA211 engines");
  });

  it("extracts breadcrumb from HTML alongside JSON-LD", () => {
    const product = crawler.extractProduct(autodocProductJsonLd, "https://www.auto-doc.fr/p/test");
    expect(product!.categoryPath).toEqual(["Filtres", "Filtre à huile"]);
  });

  it("extracts compatibility from table", () => {
    const product = crawler.extractProduct(autodocProductJsonLd, "https://www.auto-doc.fr/p/test");
    expect(product!.compatibleVehicles).toBeDefined();
    expect(product!.compatibleVehicles!.length).toBeGreaterThanOrEqual(1);
    expect(product!.compatibleVehicles![0]).toMatchObject({
      make: "Volkswagen",
      model: "Polo V",
      yearStart: 2014,
      yearEnd: 2021,
    });
  });

  it("returns null for page without product data", () => {
    const product = crawler.extractProduct("<html><body><h1>404</h1></body></html>", "https://test.com");
    expect(product).toBeNull();
  });
});

describe("MisterAutoCrawler", () => {
  const crawler = new MisterAutoCrawler();

  it("has correct site ID and base URL", () => {
    expect(crawler.siteId).toBe("mister-auto");
    expect(crawler.baseUrl).toBe("https://www.mister-auto.com");
  });

  it("extracts product links from listing", () => {
    const links = crawler.extractProductLinks(misterAutoListingHtml, "https://www.mister-auto.com/pieces-auto/bougies/");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].url).toBe("https://www.mister-auto.com/p/MA001/bosch-bougie.html");
  });

  it("extracts next page URL", () => {
    const nextUrl = crawler.getNextPageUrl(misterAutoListingHtml, "https://www.mister-auto.com/pieces-auto/bougies/");
    expect(nextUrl).toBe("https://www.mister-auto.com/pieces-auto/bougies/?page=2");
  });

  it("extracts product from JSON-LD when available", () => {
    const html = `
    <html><head>
    <script type="application/ld+json">
    {
      "@type": "Product",
      "name": "Bosch Spark Plug FR7DC+",
      "mpn": "0242235666",
      "brand": { "@type": "Brand", "name": "Bosch" },
      "offers": { "@type": "Offer", "price": "4.50" }
    }
    </script>
    </head><body>
    <ol class="breadcrumb">
      <li><a href="/">Accueil</a></li>
      <li><a href="/pieces-auto/allumage">Allumage</a></li>
    </ol>
    </body></html>`;

    const product = crawler.extractProduct(html, "https://www.mister-auto.com/p/test");
    expect(product).not.toBeNull();
    expect(product!.name).toBe("Bosch Spark Plug FR7DC+");
    expect(product!.oemNumber).toBe("0242235666");
    expect(product!.brand).toBe("Bosch");
    expect(product!.priceEur).toBe(4.5);
    expect(product!.categoryPath).toEqual(["Allumage"]);
  });
});

describe("ScraperApiClient", () => {
  // Note: actual HTTP tests would require mocking fetch or a test server.
  // Here we test the client construction and configuration.
  it("is importable and constructable", async () => {
    const { ScraperApiClient } = await import("../crawlers/scraper-api.js");
    const client = new ScraperApiClient({ apiKey: "test-key" }, 0);
    expect(client.getRequestCount()).toBe(0);
  });
});

describe("CrawlEngine", () => {
  it("is importable and constructable", async () => {
    const { CrawlEngine } = await import("../crawlers/crawl-engine.js");
    const { ScraperApiClient } = await import("../crawlers/scraper-api.js");

    const mockCrawler = {
      siteId: "test",
      baseUrl: "https://test.com",
      discoverCategories: async () => [],
      extractProductLinks: () => [],
      extractProduct: () => null,
      getNextPageUrl: () => null,
    };

    const client = new ScraperApiClient({ apiKey: "test" }, 0);
    const engine = new CrawlEngine(mockCrawler, client);
    expect(engine).toBeDefined();
  });
});
