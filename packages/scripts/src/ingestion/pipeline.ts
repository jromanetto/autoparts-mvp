import type { Database } from "@autoparts/db";
import { parseCsvFile } from "./csv-parser.js";
import type {
  ImportEntityType,
  ImportResult,
  ImportJobOptions,
  ManufacturerRow,
  CategoryRow,
  PartRow,
  VehicleRow,
  CompatibilityRow,
  CrossReferenceRow,
} from "./types.js";
import { importManufacturers } from "./importers/manufacturer-importer.js";
import { importCategories } from "./importers/category-importer.js";
import { importParts } from "./importers/part-importer.js";
import { importVehicles } from "./importers/vehicle-importer.js";
import { importCompatibility } from "./importers/compatibility-importer.js";
import { importCrossReferences } from "./importers/cross-reference-importer.js";
import { formatImportResult, formatImportSummary } from "./import-logger.js";

export interface PipelineOptions {
  db: Database;
  dryRun?: boolean;
  maxErrors?: number;
  batchSize?: number;
  /** Log function (defaults to console.error to keep stdout clean for data) */
  log?: (message: string) => void;
}

export interface PipelineFileConfig {
  entityType: ImportEntityType;
  filePath: string;
}

/**
 * Run the full import pipeline for a set of CSV files.
 * Files are imported in dependency order:
 *   manufacturers -> categories -> parts -> vehicles -> compatibility -> cross_references
 */
export async function runPipeline(
  files: PipelineFileConfig[],
  options: PipelineOptions,
): Promise<ImportResult[]> {
  const log = options.log ?? console.error.bind(console);
  const results: ImportResult[] = [];

  // Define import order based on data dependencies
  const importOrder: ImportEntityType[] = [
    "manufacturers",
    "categories",
    "parts",
    "vehicles",
    "compatibility",
    "cross_references",
  ];

  // Sort files according to dependency order
  const sorted = [...files].sort(
    (a, b) => importOrder.indexOf(a.entityType) - importOrder.indexOf(b.entityType),
  );

  for (const file of sorted) {
    log(`\nImporting ${file.entityType} from ${file.filePath}...`);

    const jobOptions: ImportJobOptions = {
      db: options.db,
      filePath: file.filePath,
      dryRun: options.dryRun,
      maxErrors: options.maxErrors,
      batchSize: options.batchSize,
    };

    const result = await importEntityFile(file.entityType, file.filePath, jobOptions);
    results.push(result);

    log(formatImportResult(result));

    // Stop pipeline if too many errors in a single entity
    if (result.stats.errors > 0 && result.stats.errors >= (options.maxErrors ?? 100)) {
      log(`\nAborting pipeline: too many errors in ${file.entityType}`);
      break;
    }
  }

  log(`\n${formatImportSummary(results)}`);
  return results;
}

async function importEntityFile(
  entityType: ImportEntityType,
  filePath: string,
  options: ImportJobOptions,
): Promise<ImportResult> {
  switch (entityType) {
    case "manufacturers": {
      const rows = parseCsvFile<ManufacturerRow>(filePath);
      return importManufacturers(rows, options);
    }
    case "categories": {
      const rows = parseCsvFile<CategoryRow>(filePath);
      return importCategories(rows, options);
    }
    case "parts": {
      const rows = parseCsvFile<PartRow>(filePath);
      return importParts(rows, options);
    }
    case "vehicles": {
      const rows = parseCsvFile<VehicleRow>(filePath);
      return importVehicles(rows, options);
    }
    case "compatibility": {
      const rows = parseCsvFile<CompatibilityRow>(filePath);
      return importCompatibility(rows, options);
    }
    case "cross_references": {
      const rows = parseCsvFile<CrossReferenceRow>(filePath);
      return importCrossReferences(rows, options);
    }
  }
}
