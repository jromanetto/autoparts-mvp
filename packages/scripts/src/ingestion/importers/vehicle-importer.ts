import { eq, and } from "drizzle-orm";
import { vehicleMakes, vehicleModels, vehicles } from "@autoparts/db/schema";
import type {
  VehicleRow,
  ImportJobOptions,
  ImportResult,
  ImportError,
} from "../types.js";
import { validateVehicleRow } from "../validators.js";
import { createEmptyStats, shouldAbort } from "../import-logger.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function importVehicles(
  rows: VehicleRow[],
  options: ImportJobOptions,
): Promise<ImportResult> {
  const startedAt = new Date();
  const stats = createEmptyStats();
  const errors: ImportError[] = [];
  const maxErrors = options.maxErrors ?? 100;

  stats.total = rows.length;

  // Caches
  const makeCache = new Map<string, string>(); // name -> id
  const modelCache = new Map<string, string>(); // "make:model" -> id

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = validateVehicleRow(row, i + 1);
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

    // Resolve or create make
    let makeId = makeCache.get(row.make_name);
    if (!makeId) {
      const makeSlug = slugify(row.make_name);
      const existing = await options.db
        .select({ id: vehicleMakes.id })
        .from(vehicleMakes)
        .where(eq(vehicleMakes.slug, makeSlug))
        .limit(1);

      if (existing.length > 0) {
        makeId = existing[0].id;
      } else {
        const inserted = await options.db
          .insert(vehicleMakes)
          .values({
            name: row.make_name,
            slug: makeSlug,
          })
          .returning({ id: vehicleMakes.id });
        makeId = inserted[0].id;
      }
      makeCache.set(row.make_name, makeId);
    }

    // Resolve or create model
    const modelKey = `${row.make_name}:${row.model_name}`;
    let modelId = modelCache.get(modelKey);
    if (!modelId) {
      const modelSlug = slugify(row.model_name);
      const existing = await options.db
        .select({ id: vehicleModels.id })
        .from(vehicleModels)
        .where(
          and(
            eq(vehicleModels.makeId, makeId),
            eq(vehicleModels.slug, modelSlug),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        modelId = existing[0].id;
      } else {
        const inserted = await options.db
          .insert(vehicleModels)
          .values({
            makeId,
            name: row.model_name,
            slug: modelSlug,
          })
          .returning({ id: vehicleModels.id });
        modelId = inserted[0].id;
      }
      modelCache.set(modelKey, modelId);
    }

    // Check for existing vehicle variant
    const yearStart = parseInt(row.year_start, 10);
    const yearEnd = row.year_end ? parseInt(row.year_end, 10) : null;
    const engineCode = row.engine_code || null;

    const existingVehicle = await options.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.modelId, modelId),
          eq(vehicles.yearStart, yearStart),
          ...(engineCode
            ? [eq(vehicles.engineCode, engineCode)]
            : []),
        ),
      )
      .limit(1);

    if (existingVehicle.length > 0) {
      await options.db
        .update(vehicles)
        .set({
          yearEnd,
          engineCode,
          engineDisplacementCc: row.engine_displacement_cc
            ? parseInt(row.engine_displacement_cc, 10)
            : null,
          fuelType: row.fuel_type || null,
          bodyType: row.body_type || null,
          trim: row.trim || null,
          ktypeNumber: row.ktype_number || null,
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, existingVehicle[0].id));
      stats.updated += 1;
    } else {
      await options.db.insert(vehicles).values({
        modelId,
        yearStart,
        yearEnd,
        engineCode,
        engineDisplacementCc: row.engine_displacement_cc
          ? parseInt(row.engine_displacement_cc, 10)
          : null,
        fuelType: row.fuel_type || null,
        bodyType: row.body_type || null,
        trim: row.trim || null,
        ktypeNumber: row.ktype_number || null,
      });
      stats.created += 1;
    }
  }

  const completedAt = new Date();
  return {
    entityType: "vehicles",
    stats,
    errors,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
