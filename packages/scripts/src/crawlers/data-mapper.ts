/**
 * Maps raw crawled product data to the ingestion pipeline CSV row types.
 * Handles deduplication, slug generation, and relationship resolution.
 */

import type {
  ManufacturerRow,
  CategoryRow,
  PartRow,
  VehicleRow,
  CompatibilityRow,
  CrossReferenceRow,
} from "../ingestion/types.js";
import type { RawProduct, CrawlResult } from "./types.js";

/** Convert a string to a URL-safe slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Maps an array of raw products (from a single site) into
 * the six entity types needed by the ingestion pipeline.
 */
export function mapProductsToEntities(
  products: RawProduct[],
  siteId: string,
): Omit<CrawlResult, "progress"> {
  const manufacturerMap = new Map<string, ManufacturerRow>();
  const categoryMap = new Map<string, CategoryRow>();
  const partMap = new Map<string, PartRow>();
  const vehicleMap = new Map<string, VehicleRow>();
  const compatibilityList: CompatibilityRow[] = [];
  const crossRefList: CrossReferenceRow[] = [];

  for (const product of products) {
    // Skip products without an OEM number — can't deduplicate without it
    if (!product.oemNumber || !product.brand) continue;

    // --- Manufacturer ---
    const brandKey = product.brand.toLowerCase().trim();
    if (!manufacturerMap.has(brandKey)) {
      manufacturerMap.set(brandKey, {
        name: product.brand.trim(),
      });
    }

    // --- Categories ---
    if (product.categoryPath && product.categoryPath.length > 0) {
      let parentSlug: string | undefined;
      for (let i = 0; i < product.categoryPath.length; i++) {
        const catName = product.categoryPath[i];
        const catSlug = slugify(catName);
        if (!categoryMap.has(catSlug)) {
          categoryMap.set(catSlug, {
            name: catName,
            slug: catSlug,
            parent_slug: parentSlug,
            level: String(i),
            sort_order: String(categoryMap.size),
          });
        }
        parentSlug = catSlug;
      }
    }

    // --- Part ---
    const partKey = `${product.oemNumber}:${brandKey}`;
    if (!partMap.has(partKey)) {
      const categorySlug =
        product.categoryPath && product.categoryPath.length > 0
          ? slugify(product.categoryPath[product.categoryPath.length - 1])
          : undefined;

      partMap.set(partKey, {
        oem_number: product.oemNumber,
        manufacturer_name: product.brand.trim(),
        category_slug: categorySlug,
        name: product.name,
        description: product.description,
        weight_grams: product.weightGrams ? String(product.weightGrams) : undefined,
        status: "active",
      });
    }

    // --- Vehicles & Compatibility ---
    if (product.compatibleVehicles) {
      for (const vc of product.compatibleVehicles) {
        // Vehicle record
        const vKey = [
          vc.make,
          vc.model,
          vc.yearStart ?? "",
          vc.engineCode ?? "",
        ].join("|").toLowerCase();

        if (!vehicleMap.has(vKey)) {
          vehicleMap.set(vKey, {
            make_name: vc.make,
            model_name: vc.model,
            year_start: String(vc.yearStart ?? 2000),
            year_end: vc.yearEnd ? String(vc.yearEnd) : undefined,
            engine_code: vc.engineCode,
            engine_displacement_cc: vc.engineDisplacementCc
              ? String(vc.engineDisplacementCc)
              : undefined,
            fuel_type: vc.fuelType,
            body_type: vc.bodyType,
            trim: vc.trim,
          });
        }

        // Compatibility mapping
        compatibilityList.push({
          part_oem_number: product.oemNumber,
          part_manufacturer: product.brand.trim(),
          vehicle_make: vc.make,
          vehicle_model: vc.model,
          vehicle_year_start: String(vc.yearStart ?? 2000),
          engine_code: vc.engineCode,
          fitment_notes: vc.fitmentNotes,
          quantity_needed: vc.quantity ? String(vc.quantity) : undefined,
          position: vc.position,
        });
      }
    }

    // --- Cross References ---
    if (product.crossReferences) {
      for (const cr of product.crossReferences) {
        crossRefList.push({
          part_oem_number: product.oemNumber,
          part_manufacturer: product.brand.trim(),
          cross_ref_oem_number: cr.oemNumber,
          cross_ref_manufacturer: cr.manufacturer,
          cross_ref_type: cr.type ?? "equivalent",
          notes: cr.notes,
        });
      }
    }
  }

  return {
    siteId,
    manufacturers: Array.from(manufacturerMap.values()),
    categories: Array.from(categoryMap.values()),
    parts: Array.from(partMap.values()),
    vehicles: Array.from(vehicleMap.values()),
    compatibility: compatibilityList,
    crossReferences: crossRefList,
  };
}
