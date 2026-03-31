import { eq, and } from "drizzle-orm";
import {
  parts,
  manufacturers,
  oemCrossReferences,
} from "@autoparts/db/schema";
import type {
  CrossReferenceRow,
  ImportJobOptions,
  ImportResult,
  ImportError,
} from "../types.js";
import { validateCrossReferenceRow } from "../validators.js";
import { createEmptyStats, shouldAbort } from "../import-logger.js";

export async function importCrossReferences(
  rows: CrossReferenceRow[],
  options: ImportJobOptions,
): Promise<ImportResult> {
  const startedAt = new Date();
  const stats = createEmptyStats();
  const errors: ImportError[] = [];
  const maxErrors = options.maxErrors ?? 100;

  stats.total = rows.length;

  const partCache = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = validateCrossReferenceRow(row, i + 1);
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

    // Resolve part
    const partKey = `${row.part_oem_number}:${row.part_manufacturer}`;
    let partId = partCache.get(partKey);
    if (!partId) {
      const mfg = await options.db
        .select({ id: manufacturers.id })
        .from(manufacturers)
        .where(eq(manufacturers.name, row.part_manufacturer))
        .limit(1);

      if (mfg.length === 0) {
        errors.push({
          row: i + 1,
          field: "part_manufacturer",
          message: `Manufacturer '${row.part_manufacturer}' not found`,
        });
        stats.errors += 1;
        if (shouldAbort(errors, maxErrors)) break;
        continue;
      }

      const part = await options.db
        .select({ id: parts.id })
        .from(parts)
        .where(
          and(
            eq(parts.oemNumber, row.part_oem_number),
            eq(parts.manufacturerId, mfg[0].id),
          ),
        )
        .limit(1);

      if (part.length === 0) {
        errors.push({
          row: i + 1,
          field: "part_oem_number",
          message: `Part '${row.part_oem_number}' by '${row.part_manufacturer}' not found`,
        });
        stats.errors += 1;
        if (shouldAbort(errors, maxErrors)) break;
        continue;
      }
      partId = part[0].id;
      partCache.set(partKey, partId);
    }

    // Dedup cross-reference
    const existing = await options.db
      .select({ id: oemCrossReferences.id })
      .from(oemCrossReferences)
      .where(
        and(
          eq(oemCrossReferences.partId, partId),
          eq(oemCrossReferences.crossRefOemNumber, row.cross_ref_oem_number),
        ),
      )
      .limit(1);

    const crossRefType = row.cross_ref_type || "equivalent";

    if (existing.length > 0) {
      await options.db
        .update(oemCrossReferences)
        .set({
          crossRefManufacturer: row.cross_ref_manufacturer || null,
          crossRefType,
          notes: row.notes || null,
        })
        .where(eq(oemCrossReferences.id, existing[0].id));
      stats.updated += 1;
    } else {
      await options.db.insert(oemCrossReferences).values({
        partId,
        crossRefOemNumber: row.cross_ref_oem_number,
        crossRefManufacturer: row.cross_ref_manufacturer || null,
        crossRefType,
        notes: row.notes || null,
      });
      stats.created += 1;
    }
  }

  const completedAt = new Date();
  return {
    entityType: "cross_references",
    stats,
    errors,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
