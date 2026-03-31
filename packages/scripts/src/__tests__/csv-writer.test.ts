import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeCrawlResults } from "../crawlers/csv-writer.js";
import type { CrawlResult, CrawlProgress } from "../crawlers/types.js";

describe("writeCrawlResults", () => {
  let outputDir: string;

  const makeProgress = (): CrawlProgress => ({
    siteId: "test",
    phase: "complete",
    pagesProcessed: 5,
    productsExtracted: 10,
    errorsCount: 0,
    startedAt: new Date(),
    lastActivityAt: new Date(),
  });

  beforeEach(() => {
    outputDir = join(tmpdir(), `crawl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  });

  afterEach(() => {
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("creates output directory and writes manufacturer CSV", () => {
    const result: CrawlResult = {
      siteId: "test",
      manufacturers: [
        { name: "Bosch", country: "Germany", website: "https://bosch.com" },
        { name: "TRW" },
      ],
      categories: [],
      parts: [],
      vehicles: [],
      compatibility: [],
      crossReferences: [],
      progress: makeProgress(),
    };

    const writeResult = writeCrawlResults(result, outputDir);

    expect(writeResult.files).toHaveLength(1);
    expect(writeResult.files[0].entity).toBe("manufacturers");
    expect(writeResult.files[0].rowCount).toBe(2);

    const csv = readFileSync(writeResult.files[0].path, "utf-8");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("name,country,website");
    expect(lines[1]).toBe("Bosch,Germany,https://bosch.com");
    expect(lines[2]).toBe("TRW,,");
  });

  it("writes parts CSV with proper escaping", () => {
    const result: CrawlResult = {
      siteId: "test",
      manufacturers: [],
      categories: [],
      parts: [
        {
          oem_number: "ABC123",
          manufacturer_name: "Bosch",
          name: 'Part with "quotes" and, commas',
          status: "active",
        },
      ],
      vehicles: [],
      compatibility: [],
      crossReferences: [],
      progress: makeProgress(),
    };

    const writeResult = writeCrawlResults(result, outputDir);
    const csv = readFileSync(writeResult.files[0].path, "utf-8");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "oem_number,manufacturer_name,category_slug,name,description,weight_grams,status",
    );
    // Field with quotes and commas should be properly escaped
    expect(lines[1]).toContain('"Part with ""quotes"" and, commas"');
  });

  it("writes all entity types when data is present", () => {
    const result: CrawlResult = {
      siteId: "test",
      manufacturers: [{ name: "Bosch" }],
      categories: [{ name: "Brakes", slug: "brakes" }],
      parts: [
        {
          oem_number: "ABC",
          manufacturer_name: "Bosch",
          name: "Part",
          status: "active",
        },
      ],
      vehicles: [
        { make_name: "VW", model_name: "Golf", year_start: "2020" },
      ],
      compatibility: [
        {
          part_oem_number: "ABC",
          part_manufacturer: "Bosch",
          vehicle_make: "VW",
          vehicle_model: "Golf",
          vehicle_year_start: "2020",
        },
      ],
      crossReferences: [
        {
          part_oem_number: "ABC",
          part_manufacturer: "Bosch",
          cross_ref_oem_number: "DEF",
          cross_ref_type: "equivalent",
        },
      ],
      progress: makeProgress(),
    };

    const writeResult = writeCrawlResults(result, outputDir);
    expect(writeResult.files).toHaveLength(6);

    const entities = writeResult.files.map((f) => f.entity);
    expect(entities).toContain("manufacturers");
    expect(entities).toContain("categories");
    expect(entities).toContain("parts");
    expect(entities).toContain("vehicles");
    expect(entities).toContain("compatibility");
    expect(entities).toContain("cross_references");
  });

  it("skips empty entity types", () => {
    const result: CrawlResult = {
      siteId: "test",
      manufacturers: [{ name: "Bosch" }],
      categories: [],
      parts: [],
      vehicles: [],
      compatibility: [],
      crossReferences: [],
      progress: makeProgress(),
    };

    const writeResult = writeCrawlResults(result, outputDir);
    expect(writeResult.files).toHaveLength(1);
    expect(writeResult.files[0].entity).toBe("manufacturers");
  });

  it("returns correct output directory", () => {
    const result: CrawlResult = {
      siteId: "test",
      manufacturers: [{ name: "Bosch" }],
      categories: [],
      parts: [],
      vehicles: [],
      compatibility: [],
      crossReferences: [],
      progress: makeProgress(),
    };

    const writeResult = writeCrawlResults(result, outputDir);
    expect(writeResult.outputDir).toBe(outputDir);
  });
});
