/**
 * Maps raw crawled product data to the ingestion pipeline CSV row types.
 * Handles deduplication, slug generation, and relationship resolution.
 *
 * Cross-source deduplication:
 * - OEM numbers normalized (strip spaces/dashes, uppercase)
 * - Manufacturer names resolved via alias table
 * - Vehicle make names canonicalized
 * - Cross-references deduplicated by (part_oem, cross_ref_oem) pair
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
 * Normalize an OEM number for deduplication:
 * strip whitespace, remove common separators, uppercase.
 */
export function normalizeOemNumber(oem: string): string {
  return oem
    .trim()
    .toUpperCase()
    .replace(/[\s\-_.\/]+/g, "");
}

/** Known manufacturer name aliases → canonical names */
const MANUFACTURER_ALIASES: Record<string, string> = {
  "vw": "Volkswagen",
  "vag": "Volkswagen",
  "mb": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  "mercedes": "Mercedes-Benz",
  "merc": "Mercedes-Benz",
  "benz": "Mercedes-Benz",
  "bmw ag": "BMW",
  "gm": "General Motors",
  "general motors": "General Motors",
  "psa": "PSA Group",
  "stellantis": "Stellantis",
  "fca": "FCA",
  "mann filter": "Mann-Filter",
  "mann+hummel": "Mann-Filter",
  "sachs": "ZF Sachs",
  "ate": "ATE",
  "trw": "TRW",
  "lemforder": "Lemförder",
  "lemförder": "Lemförder",
  "hella": "HELLA",
  "febi": "Febi Bilstein",
  "febi bilstein": "Febi Bilstein",
  "meyle": "MEYLE",
  "ngk": "NGK",
  "skf": "SKF",
  "dayco": "Dayco",
  "gates": "Gates",
  "contitech": "ContiTech",
  "continental": "Continental",
  "luk": "LuK",
  "ina": "INA",
  "fag": "FAG",
  "schaeffler": "Schaeffler",
  "mahle": "MAHLE",
  "knecht": "MAHLE",
  "behr": "MAHLE Behr",
  "pierburg": "Pierburg",
  "elring": "Elring",
  "victor reinz": "Victor Reinz",
  "reinz": "Victor Reinz",
  "delphi": "Delphi",
  "brembo": "Brembo",
  "ferodo": "Ferodo",
  "textar": "Textar",
  "pagid": "Pagid",
  "zimmermann": "Zimmermann",
  "sachs boge": "Sachs",
  "bilstein": "Bilstein",
  "koni": "KONI",
  "monroe": "Monroe",
  "kayaba": "KYB",
  "kyb": "KYB",
  "champion": "Champion",
};

/** Known vehicle make aliases → canonical names */
const MAKE_ALIASES: Record<string, string> = {
  "vw": "Volkswagen",
  "volkswagen ag": "Volkswagen",
  "mb": "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  "mercedes": "Mercedes-Benz",
  "merc": "Mercedes-Benz",
  "benz": "Mercedes-Benz",
  "bmw ag": "BMW",
  "gm": "General Motors",
  "chevrolet": "Chevrolet",
  "chevy": "Chevrolet",
  "alfa": "Alfa Romeo",
  "alfa romeo": "Alfa Romeo",
  "ds": "DS Automobiles",
  "mini": "MINI",
  "mini cooper": "MINI",
  "land rover": "Land Rover",
  "landrover": "Land Rover",
  "range rover": "Land Rover",
};

/** Resolve manufacturer name using alias table */
export function resolveManufacturer(name: string): string {
  const key = name.toLowerCase().trim();
  return MANUFACTURER_ALIASES[key] ?? name.trim();
}

/** Resolve vehicle make name using alias table */
export function resolveVehicleMake(name: string): string {
  const key = name.toLowerCase().trim();
  return MAKE_ALIASES[key] ?? name.trim();
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

  // Track cross-reference and compatibility uniqueness
  const crossRefKeys = new Set<string>();
  const compatibilityKeys = new Set<string>();

  for (const product of products) {
    // Skip products without an OEM number — can't deduplicate without it
    if (!product.oemNumber || !product.brand) continue;

    // Normalize OEM number and resolve manufacturer name
    const normalizedOem = normalizeOemNumber(product.oemNumber);
    const resolvedBrand = resolveManufacturer(product.brand);

    // --- Manufacturer ---
    const brandKey = resolvedBrand.toLowerCase();
    if (!manufacturerMap.has(brandKey)) {
      manufacturerMap.set(brandKey, {
        name: resolvedBrand,
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

    // --- Part (deduplicated by normalized OEM + resolved brand) ---
    const partKey = `${normalizedOem}:${brandKey}`;
    if (!partMap.has(partKey)) {
      const categorySlug =
        product.categoryPath && product.categoryPath.length > 0
          ? slugify(product.categoryPath[product.categoryPath.length - 1])
          : undefined;

      partMap.set(partKey, {
        oem_number: product.oemNumber,
        manufacturer_name: resolvedBrand,
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
        // Resolve vehicle make name
        const resolvedMake = resolveVehicleMake(vc.make);

        // Vehicle record
        const vKey = [
          resolvedMake,
          vc.model,
          vc.yearStart ?? "",
          vc.engineCode ?? "",
        ].join("|").toLowerCase();

        if (!vehicleMap.has(vKey)) {
          vehicleMap.set(vKey, {
            make_name: resolvedMake,
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

        // Compatibility mapping (deduplicated)
        const compatKey = `${normalizedOem}:${brandKey}:${resolvedMake.toLowerCase()}:${vc.model.toLowerCase()}:${vc.yearStart ?? ""}:${vc.engineCode ?? ""}:${vc.position ?? ""}`;
        if (!compatibilityKeys.has(compatKey)) {
          compatibilityKeys.add(compatKey);
          compatibilityList.push({
            part_oem_number: product.oemNumber,
            part_manufacturer: resolvedBrand,
            vehicle_make: resolvedMake,
            vehicle_model: vc.model,
            vehicle_year_start: String(vc.yearStart ?? 2000),
            engine_code: vc.engineCode,
            fitment_notes: vc.fitmentNotes,
            quantity_needed: vc.quantity ? String(vc.quantity) : undefined,
            position: vc.position,
          });
        }
      }
    }

    // --- Cross References (deduplicated by normalized OEM pair) ---
    if (product.crossReferences) {
      for (const cr of product.crossReferences) {
        const normalizedCrossRef = normalizeOemNumber(cr.oemNumber);
        const crKey = `${normalizedOem}:${normalizedCrossRef}`;

        if (!crossRefKeys.has(crKey)) {
          crossRefKeys.add(crKey);
          crossRefList.push({
            part_oem_number: product.oemNumber,
            part_manufacturer: resolvedBrand,
            cross_ref_oem_number: cr.oemNumber,
            cross_ref_manufacturer: cr.manufacturer ? resolveManufacturer(cr.manufacturer) : undefined,
            cross_ref_type: cr.type ?? "equivalent",
            notes: cr.notes,
          });
        }
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
