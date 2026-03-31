#!/usr/bin/env tsx
/**
 * CLI for running web crawlers against auto parts sites.
 *
 * Usage:
 *   pnpm --filter @autoparts/scripts crawl oscaro --max-products 100
 *   pnpm --filter @autoparts/scripts crawl autodoc --categories "freinage,filtres" --max-pages 50
 *   pnpm --filter @autoparts/scripts crawl --list
 */

import { getCrawler, listCrawlers } from "./crawlers/sites/index.js";
import { ScraperApiClient } from "./crawlers/scraper-api.js";
import { CrawlEngine } from "./crawlers/crawl-engine.js";
import type { CrawlConfig } from "./crawlers/types.js";

function printUsage(): void {
  console.log(`
Auto Parts Web Crawler CLI

Usage:
  crawl <site-id> [options]
  crawl --list

Sites:
  ${listCrawlers().join(", ")}

Options:
  --api-key <key>       ScraperAPI key (or set SCRAPER_API_KEY env var)
  --max-products <n>    Maximum products to crawl (default: 100)
  --max-pages <n>       Maximum listing pages to crawl (default: 50)
  --delay <ms>          Delay between requests in ms (default: 1500)
  --output <dir>        Output directory (default: ./crawl-output/<site-id>)
  --categories <list>   Comma-separated category filter
  --render              Enable JS rendering (slower but more complete)
  --list                List available crawlers
  --help                Show this help

Examples:
  crawl oscaro --max-products 200 --categories "freinage,filtres"
  crawl autodoc --max-pages 10 --render
  crawl mister-auto --output ./data/mister-auto
  `);
}

function parseArgs(args: string[]): {
  siteId?: string;
  list?: boolean;
  help?: boolean;
  apiKey?: string;
  maxProducts: number;
  maxPages: number;
  delay: number;
  output?: string;
  categories?: string[];
  render: boolean;
} {
  const result = {
    maxProducts: 100,
    maxPages: 50,
    delay: 1500,
    render: false,
  } as ReturnType<typeof parseArgs>;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--list") {
      result.list = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--render") {
      result.render = true;
    } else if (arg === "--api-key" && args[i + 1]) {
      result.apiKey = args[++i];
    } else if (arg === "--max-products" && args[i + 1]) {
      result.maxProducts = parseInt(args[++i], 10);
    } else if (arg === "--max-pages" && args[i + 1]) {
      result.maxPages = parseInt(args[++i], 10);
    } else if (arg === "--delay" && args[i + 1]) {
      result.delay = parseInt(args[++i], 10);
    } else if (arg === "--output" && args[i + 1]) {
      result.output = args[++i];
    } else if (arg === "--categories" && args[i + 1]) {
      result.categories = args[++i].split(",").map((s) => s.trim());
    } else if (!arg.startsWith("-") && !result.siteId) {
      result.siteId = arg;
    }

    i++;
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.list) {
    console.log("Available crawlers:");
    for (const id of listCrawlers()) {
      console.log(`  - ${id}`);
    }
    return;
  }

  if (!args.siteId) {
    console.error("Error: No site specified. Use --list to see available sites.");
    printUsage();
    process.exit(1);
  }

  const apiKey = args.apiKey || process.env.SCRAPER_API_KEY;
  if (!apiKey) {
    console.error("Error: ScraperAPI key required. Use --api-key or set SCRAPER_API_KEY env var.");
    process.exit(1);
  }

  const crawler = getCrawler(args.siteId);
  const outputDir = args.output || `./crawl-output/${args.siteId}`;

  const config: CrawlConfig = {
    siteId: args.siteId,
    baseUrl: crawler.baseUrl,
    scraperApi: {
      apiKey,
      render: args.render,
    },
    concurrency: 1, // ScraperAPI handles concurrency
    requestDelayMs: args.delay,
    maxPages: args.maxPages,
    maxProducts: args.maxProducts,
    outputDir,
    categories: args.categories,
  };

  console.log(`\nStarting crawl: ${args.siteId}`);
  console.log(`  Max products: ${config.maxProducts}`);
  console.log(`  Max pages: ${config.maxPages}`);
  console.log(`  Request delay: ${config.requestDelayMs}ms`);
  console.log(`  JS rendering: ${config.scraperApi.render ? "enabled" : "disabled"}`);
  console.log(`  Output: ${outputDir}`);
  if (config.categories?.length) {
    console.log(`  Categories: ${config.categories.join(", ")}`);
  }
  console.log("");

  const client = new ScraperApiClient(config.scraperApi, config.requestDelayMs);
  const engine = new CrawlEngine(crawler, client, {
    onProgress: (p) => {
      const elapsed = Math.round((Date.now() - p.startedAt.getTime()) / 1000);
      console.log(
        `[${p.phase}] Pages: ${p.pagesProcessed} | Products: ${p.productsExtracted} | Errors: ${p.errorsCount} | ${elapsed}s`,
      );
    },
    onError: (msg, url) => {
      if (url) {
        console.log(`  ${msg} (${url})`);
      } else {
        console.log(`  ${msg}`);
      }
    },
  });

  try {
    const { result, files } = await engine.crawl(config);

    console.log("\n--- Crawl Complete ---");
    console.log(`Products extracted: ${result.progress.productsExtracted}`);
    console.log(`Pages processed: ${result.progress.pagesProcessed}`);
    console.log(`Errors: ${result.progress.errorsCount}`);
    console.log(`API requests: ${client.getRequestCount()}`);
    console.log("\nOutput files:");
    for (const f of files.files) {
      console.log(`  ${f.entity}: ${f.rowCount} rows -> ${f.path}`);
    }
    console.log("\nEntities mapped:");
    console.log(`  Manufacturers: ${result.manufacturers.length}`);
    console.log(`  Categories: ${result.categories.length}`);
    console.log(`  Parts: ${result.parts.length}`);
    console.log(`  Vehicles: ${result.vehicles.length}`);
    console.log(`  Compatibility: ${result.compatibility.length}`);
    console.log(`  Cross-references: ${result.crossReferences.length}`);
  } catch (err) {
    console.error("\nCrawl failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
