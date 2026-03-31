import { eq } from "drizzle-orm";
import { manufacturers } from "@autoparts/db/schema";
import type {
  ManufacturerRow,
  ImportJobOptions,
  ImportResult,
  ImportError,
} from "../types.js";
import { validateManufacturerRow } from "../validators.js";
import { createEmptyStats, shouldAbort } from "../import-logger.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function importManufacturers(
  rows: ManufacturerRow[],
  options: ImportJobOptions,
): Promise<ImportResult> {
  const startedAt = new Date();
  const stats = createEmptyStats();
  const errors: ImportError[] = [];
  const maxErrors = options.maxErrors ?? 100;

  stats.total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = validateManufacturerRow(row, i + 1);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      stats.errors += 1;
      if (shouldAbort(errors, maxErrors)) break;
      continue;
    }

    if (options.dryRun) {
      stats.created += 1;
      continue;
    }

    const slug = slugify(row.name);

    const existing = await options.db
      .select({ id: manufacturers.id })
      .from(manufacturers)
      .where(eq(manufacturers.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      // Upsert: update existing
      await options.db
        .update(manufacturers)
        .set({
          name: row.name,
          country: row.country || null,
          website: row.website || null,
          updatedAt: new Date(),
        })
        .where(eq(manufacturers.id, existing[0].id));
      stats.updated += 1;
    } else {
      await options.db.insert(manufacturers).values({
        name: row.name,
        slug,
        country: row.country || null,
        website: row.website || null,
      });
      stats.created += 1;
    }
  }

  const completedAt = new Date();
  return {
    entityType: "manufacturers",
    stats,
    errors,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
