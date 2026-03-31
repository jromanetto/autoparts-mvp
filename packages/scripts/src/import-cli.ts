import { createDb } from "@autoparts/db";
import { runPipeline } from "./ingestion/pipeline.js";
import type { ImportEntityType } from "./ingestion/types.js";
import type { PipelineFileConfig } from "./ingestion/pipeline.js";

const VALID_ENTITIES: ImportEntityType[] = [
  "manufacturers",
  "categories",
  "parts",
  "vehicles",
  "compatibility",
  "cross_references",
];

function usage(): never {
  console.error(`Usage: import-cli [options] <entity:file> [entity:file ...]

Import CSV data into the AutoParts database.

Entity types: ${VALID_ENTITIES.join(", ")}

Arguments:
  entity:file    Entity type and CSV file path (e.g., manufacturers:./data/mfg.csv)

Options:
  --dry-run      Validate only, no database writes
  --max-errors N Stop after N errors per entity (default: 100)
  --db-url URL   Database connection string (default: DATABASE_URL env var)
  --help         Show this help

Examples:
  # Import manufacturers and parts
  pnpm import manufacturers:./data/manufacturers.csv parts:./data/parts.csv

  # Dry run to validate data
  pnpm import --dry-run manufacturers:./data/manufacturers.csv

  # Full pipeline import
  pnpm import \\
    manufacturers:./data/manufacturers.csv \\
    categories:./data/categories.csv \\
    parts:./data/parts.csv \\
    vehicles:./data/vehicles.csv \\
    compatibility:./data/compatibility.csv \\
    cross_references:./data/cross_refs.csv
`);
  process.exit(1);
}

function parseArgs(args: string[]) {
  let dryRun = false;
  let maxErrors = 100;
  let dbUrl = process.env.DATABASE_URL;
  const files: PipelineFileConfig[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      usage();
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--max-errors") {
      maxErrors = parseInt(args[++i], 10);
      if (isNaN(maxErrors) || maxErrors < 1) {
        console.error("--max-errors must be a positive integer");
        process.exit(1);
      }
    } else if (arg === "--db-url") {
      dbUrl = args[++i];
    } else if (arg.includes(":")) {
      const colonIdx = arg.indexOf(":");
      const entityType = arg.substring(0, colonIdx) as ImportEntityType;
      const filePath = arg.substring(colonIdx + 1);

      if (!VALID_ENTITIES.includes(entityType)) {
        console.error(`Unknown entity type: ${entityType}`);
        console.error(`Valid types: ${VALID_ENTITIES.join(", ")}`);
        process.exit(1);
      }

      files.push({ entityType, filePath });
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }

  if (files.length === 0) {
    console.error("No files specified");
    usage();
  }

  if (!dbUrl) {
    console.error("DATABASE_URL environment variable is required (or use --db-url)");
    process.exit(1);
  }

  return { dryRun, maxErrors, dbUrl, files };
}

async function main() {
  const args = process.argv.slice(2);
  const { dryRun, maxErrors, dbUrl, files } = parseArgs(args);

  const db = createDb(dbUrl);

  console.error(`AutoParts Data Import${dryRun ? " (DRY RUN)" : ""}`);
  console.error(`Files: ${files.map((f) => `${f.entityType}:${f.filePath}`).join(", ")}`);

  const results = await runPipeline(files, {
    db,
    dryRun,
    maxErrors,
  });

  const hasErrors = results.some((r) => r.stats.errors > 0);
  process.exit(hasErrors ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
