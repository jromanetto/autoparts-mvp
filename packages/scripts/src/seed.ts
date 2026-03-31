/**
 * Seed script: runs the import pipeline against the bundled seed-data CSVs.
 * Usage: tsx packages/scripts/src/seed.ts
 * Requires: DATABASE_URL env var
 */
import { createDb } from "@autoparts/db";
import { runPipeline } from "./ingestion/pipeline.js";
import type { PipelineFileConfig } from "./ingestion/pipeline.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "../../../seed-data");

const SEED_FILES: PipelineFileConfig[] = [
  { entityType: "manufacturers", filePath: resolve(SEED_DIR, "manufacturers.csv") },
  { entityType: "categories", filePath: resolve(SEED_DIR, "categories.csv") },
  { entityType: "parts", filePath: resolve(SEED_DIR, "parts.csv") },
  { entityType: "vehicles", filePath: resolve(SEED_DIR, "vehicles.csv") },
  { entityType: "compatibility", filePath: resolve(SEED_DIR, "compatibility.csv") },
  { entityType: "cross_references", filePath: resolve(SEED_DIR, "cross_references.csv") },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Verify seed files exist
  for (const { filePath, entityType } of SEED_FILES) {
    if (!existsSync(filePath)) {
      console.error(`Missing seed file for ${entityType}: ${filePath}`);
      process.exit(1);
    }
  }

  console.log("Starting seed data import...");
  console.log(`Seed directory: ${SEED_DIR}`);

  const db = createDb(dbUrl);

  const results = await runPipeline(SEED_FILES, {
    db,
    dryRun: false,
    maxErrors: 100,
  });

  const totalCreated = results.reduce((sum, r) => sum + r.stats.created, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.stats.errors, 0);

  console.log(`\nSeed complete: ${totalCreated} records created, ${totalErrors} errors`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
