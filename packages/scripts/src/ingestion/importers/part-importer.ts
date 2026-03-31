import { eq, and } from "drizzle-orm";
import { parts, manufacturers, categories } from "@autoparts/db/schema";
import type {
  PartRow,
  ImportJobOptions,
  ImportResult,
  ImportError,
} from "../types.js";
import { validatePartRow } from "../validators.js";
import { createEmptyStats, shouldAbort } from "../import-logger.js";

export async function importParts(
  rows: PartRow[],
  options: ImportJobOptions,
): Promise<ImportResult> {
  const startedAt = new Date();
  const stats = createEmptyStats();
  const errors: ImportError[] = [];
  const maxErrors = options.maxErrors ?? 100;

  stats.total = rows.length;

  // Cache manufacturer name -> id
  const mfgCache = new Map<string, string>();
  // Cache category slug -> id
  const catCache = new Map<string, string | null>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = validatePartRow(row, i + 1);
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

    // Resolve manufacturer
    let manufacturerId = mfgCache.get(row.manufacturer_name);
    if (!manufacturerId) {
      const mfg = await options.db
        .select({ id: manufacturers.id })
        .from(manufacturers)
        .where(eq(manufacturers.name, row.manufacturer_name))
        .limit(1);
      if (mfg.length === 0) {
        errors.push({
          row: i + 1,
          field: "manufacturer_name",
          message: `Manufacturer '${row.manufacturer_name}' not found`,
        });
        stats.errors += 1;
        if (shouldAbort(errors, maxErrors)) break;
        continue;
      }
      manufacturerId = mfg[0].id;
      mfgCache.set(row.manufacturer_name, manufacturerId);
    }

    // Resolve category (optional)
    let categoryId: string | null = null;
    if (row.category_slug) {
      if (catCache.has(row.category_slug)) {
        categoryId = catCache.get(row.category_slug) ?? null;
      } else {
        const cat = await options.db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, row.category_slug))
          .limit(1);
        if (cat.length > 0) {
          categoryId = cat[0].id;
        } else {
          errors.push({
            row: i + 1,
            field: "category_slug",
            message: `Category '${row.category_slug}' not found`,
          });
          stats.errors += 1;
          if (shouldAbort(errors, maxErrors)) break;
          continue;
        }
        catCache.set(row.category_slug, categoryId);
      }
    }

    // Dedup: check existing by OEM number + manufacturer
    const existing = await options.db
      .select({ id: parts.id })
      .from(parts)
      .where(
        and(
          eq(parts.oemNumber, row.oem_number),
          eq(parts.manufacturerId, manufacturerId),
        ),
      )
      .limit(1);

    const partStatus = (row.status as "active" | "discontinued" | "pending") || "active";

    if (existing.length > 0) {
      await options.db
        .update(parts)
        .set({
          name: row.name,
          categoryId,
          description: row.description || null,
          weightGrams: row.weight_grams ? parseInt(row.weight_grams, 10) : null,
          status: partStatus,
          updatedAt: new Date(),
        })
        .where(eq(parts.id, existing[0].id));
      stats.updated += 1;
    } else {
      await options.db.insert(parts).values({
        oemNumber: row.oem_number,
        manufacturerId,
        categoryId,
        name: row.name,
        description: row.description || null,
        weightGrams: row.weight_grams ? parseInt(row.weight_grams, 10) : null,
        status: partStatus,
      });
      stats.created += 1;
    }
  }

  const completedAt = new Date();
  return {
    entityType: "parts",
    stats,
    errors,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
