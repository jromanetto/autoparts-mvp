import { eq, and } from "drizzle-orm";
import {
  parts,
  manufacturers,
  vehicleMakes,
  vehicleModels,
  vehicles,
  partVehicleCompatibility,
} from "@autoparts/db/schema";
import type {
  CompatibilityRow,
  ImportJobOptions,
  ImportResult,
  ImportError,
} from "../types.js";
import { validateCompatibilityRow } from "../validators.js";
import { createEmptyStats, shouldAbort } from "../import-logger.js";

export async function importCompatibility(
  rows: CompatibilityRow[],
  options: ImportJobOptions,
): Promise<ImportResult> {
  const startedAt = new Date();
  const stats = createEmptyStats();
  const errors: ImportError[] = [];
  const maxErrors = options.maxErrors ?? 100;

  stats.total = rows.length;

  // Caches
  const partCache = new Map<string, string>(); // "oem:mfg" -> partId
  const vehicleCache = new Map<string, string>(); // "make:model:year:engine" -> vehicleId

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = validateCompatibilityRow(row, i + 1);
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
      // Find manufacturer first
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

    // Resolve vehicle
    const vehicleKey = `${row.vehicle_make}:${row.vehicle_model}:${row.vehicle_year_start}:${row.engine_code || ""}`;
    let vehicleId = vehicleCache.get(vehicleKey);
    if (!vehicleId) {
      const make = await options.db
        .select({ id: vehicleMakes.id })
        .from(vehicleMakes)
        .where(eq(vehicleMakes.name, row.vehicle_make))
        .limit(1);

      if (make.length === 0) {
        errors.push({
          row: i + 1,
          field: "vehicle_make",
          message: `Vehicle make '${row.vehicle_make}' not found`,
        });
        stats.errors += 1;
        if (shouldAbort(errors, maxErrors)) break;
        continue;
      }

      const model = await options.db
        .select({ id: vehicleModels.id })
        .from(vehicleModels)
        .where(
          and(
            eq(vehicleModels.makeId, make[0].id),
            eq(vehicleModels.name, row.vehicle_model),
          ),
        )
        .limit(1);

      if (model.length === 0) {
        errors.push({
          row: i + 1,
          field: "vehicle_model",
          message: `Vehicle model '${row.vehicle_model}' by '${row.vehicle_make}' not found`,
        });
        stats.errors += 1;
        if (shouldAbort(errors, maxErrors)) break;
        continue;
      }

      const yearStart = parseInt(row.vehicle_year_start, 10);
      const vehicleQuery = await options.db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.modelId, model[0].id),
            eq(vehicles.yearStart, yearStart),
            ...(row.engine_code
              ? [eq(vehicles.engineCode, row.engine_code)]
              : []),
          ),
        )
        .limit(1);

      if (vehicleQuery.length === 0) {
        errors.push({
          row: i + 1,
          field: "vehicle_year_start",
          message: `Vehicle '${row.vehicle_make} ${row.vehicle_model} ${yearStart}' not found`,
        });
        stats.errors += 1;
        if (shouldAbort(errors, maxErrors)) break;
        continue;
      }
      vehicleId = vehicleQuery[0].id;
      vehicleCache.set(vehicleKey, vehicleId);
    }

    // Upsert compatibility
    const position = row.position || null;
    const existing = await options.db
      .select({ id: partVehicleCompatibility.id })
      .from(partVehicleCompatibility)
      .where(
        and(
          eq(partVehicleCompatibility.partId, partId),
          eq(partVehicleCompatibility.vehicleId, vehicleId),
          ...(position
            ? [eq(partVehicleCompatibility.position, position)]
            : []),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await options.db
        .update(partVehicleCompatibility)
        .set({
          fitmentNotes: row.fitment_notes || null,
          quantityNeeded: row.quantity_needed
            ? parseInt(row.quantity_needed, 10)
            : 1,
          position,
        })
        .where(eq(partVehicleCompatibility.id, existing[0].id));
      stats.updated += 1;
    } else {
      await options.db.insert(partVehicleCompatibility).values({
        partId,
        vehicleId,
        fitmentNotes: row.fitment_notes || null,
        quantityNeeded: row.quantity_needed
          ? parseInt(row.quantity_needed, 10)
          : 1,
        position,
      });
      stats.created += 1;
    }
  }

  const completedAt = new Date();
  return {
    entityType: "compatibility",
    stats,
    errors,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
