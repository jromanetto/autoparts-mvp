/**
 * Writes crawled data to CSV files compatible with the ingestion pipeline.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CrawlResult } from "./types.js";

/** Escape a CSV field value */
function escapeCsv(value: string | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Write a set of rows to a CSV file */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeCsv(filePath: string, headers: string[], rows: Record<string, any>[]): number {
  const lines = [headers.join(",")];
  for (const row of rows) {
    const values = headers.map((h) => escapeCsv(row[h]));
    lines.push(values.join(","));
  }
  writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
  return rows.length;
}

export interface WriteResult {
  files: { entity: string; path: string; rowCount: number }[];
  outputDir: string;
}

/**
 * Write all crawl results to CSV files in the output directory.
 * File naming follows the ingestion pipeline convention.
 */
export function writeCrawlResults(result: CrawlResult, outputDir: string): WriteResult {
  mkdirSync(outputDir, { recursive: true });

  const files: WriteResult["files"] = [];

  if (result.manufacturers.length > 0) {
    const path = join(outputDir, "manufacturers.csv");
    const count = writeCsv(path, ["name", "country", "website"], result.manufacturers);
    files.push({ entity: "manufacturers", path, rowCount: count });
  }

  if (result.categories.length > 0) {
    const path = join(outputDir, "categories.csv");
    const count = writeCsv(
      path,
      ["name", "slug", "parent_slug", "description", "level", "sort_order"],
      result.categories,
    );
    files.push({ entity: "categories", path, rowCount: count });
  }

  if (result.parts.length > 0) {
    const path = join(outputDir, "parts.csv");
    const count = writeCsv(
      path,
      ["oem_number", "manufacturer_name", "category_slug", "name", "description", "weight_grams", "status"],
      result.parts,
    );
    files.push({ entity: "parts", path, rowCount: count });
  }

  if (result.vehicles.length > 0) {
    const path = join(outputDir, "vehicles.csv");
    const count = writeCsv(
      path,
      [
        "make_name", "model_name", "year_start", "year_end",
        "engine_code", "engine_displacement_cc", "fuel_type",
        "body_type", "trim", "ktype_number",
      ],
      result.vehicles,
    );
    files.push({ entity: "vehicles", path, rowCount: count });
  }

  if (result.compatibility.length > 0) {
    const path = join(outputDir, "compatibility.csv");
    const count = writeCsv(
      path,
      [
        "part_oem_number", "part_manufacturer", "vehicle_make",
        "vehicle_model", "vehicle_year_start", "engine_code",
        "fitment_notes", "quantity_needed", "position",
      ],
      result.compatibility,
    );
    files.push({ entity: "compatibility", path, rowCount: count });
  }

  if (result.crossReferences.length > 0) {
    const path = join(outputDir, "cross_references.csv");
    const count = writeCsv(
      path,
      [
        "part_oem_number", "part_manufacturer", "cross_ref_oem_number",
        "cross_ref_manufacturer", "cross_ref_type", "notes",
      ],
      result.crossReferences,
    );
    files.push({ entity: "cross_references", path, rowCount: count });
  }

  return { files, outputDir };
}
