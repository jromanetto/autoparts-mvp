import { describe, it, expect } from "vitest";
import { mapProductsToEntities } from "../crawlers/data-mapper.js";
import type { RawProduct } from "../crawlers/types.js";

describe("mapProductsToEntities", () => {
  const makeProduct = (overrides: Partial<RawProduct> = {}): RawProduct => ({
    sourceUrl: "https://example.com/p/1",
    name: "Bosch Front Brake Pad Set",
    oemNumber: "0986494524",
    brand: "Bosch",
    categoryPath: ["Braking System", "Brake Pads"],
    compatibleVehicles: [
      {
        make: "Volkswagen",
        model: "Golf VII",
        yearStart: 2012,
        yearEnd: 2019,
        engineCode: "CJSA",
        engineDisplacementCc: 1400,
        fuelType: "gasoline",
      },
    ],
    crossReferences: [
      {
        oemNumber: "GDB1550",
        manufacturer: "TRW",
        type: "equivalent",
      },
    ],
    priceEur: 45.99,
    weightGrams: 450,
    ...overrides,
  });

  it("extracts manufacturers with deduplication", () => {
    const products = [
      makeProduct({ brand: "Bosch" }),
      makeProduct({ brand: "Bosch", oemNumber: "0986494525" }),
      makeProduct({ brand: "TRW", oemNumber: "GDB1550" }),
    ];

    const result = mapProductsToEntities(products, "test");
    expect(result.manufacturers).toHaveLength(2);
    expect(result.manufacturers.map((m) => m.name)).toContain("Bosch");
    expect(result.manufacturers.map((m) => m.name)).toContain("TRW");
  });

  it("builds hierarchical category structure", () => {
    const products = [makeProduct()];
    const result = mapProductsToEntities(products, "test");

    expect(result.categories).toHaveLength(2);

    const braking = result.categories.find((c) => c.slug === "braking-system");
    expect(braking).toBeDefined();
    expect(braking!.parent_slug).toBeUndefined();
    expect(braking!.level).toBe("0");

    const pads = result.categories.find((c) => c.slug === "brake-pads");
    expect(pads).toBeDefined();
    expect(pads!.parent_slug).toBe("braking-system");
    expect(pads!.level).toBe("1");
  });

  it("creates parts with correct manufacturer and category references", () => {
    const products = [makeProduct()];
    const result = mapProductsToEntities(products, "test");

    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]).toMatchObject({
      oem_number: "0986494524",
      manufacturer_name: "Bosch",
      category_slug: "brake-pads",
      name: "Bosch Front Brake Pad Set",
      weight_grams: "450",
      status: "active",
    });
  });

  it("deduplicates parts by oem_number + brand", () => {
    const products = [
      makeProduct(),
      makeProduct({ name: "Same Part Different Page" }),
    ];

    const result = mapProductsToEntities(products, "test");
    expect(result.parts).toHaveLength(1);
    // First occurrence wins
    expect(result.parts[0].name).toBe("Bosch Front Brake Pad Set");
  });

  it("creates vehicle records from compatibility data", () => {
    const products = [makeProduct()];
    const result = mapProductsToEntities(products, "test");

    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0]).toMatchObject({
      make_name: "Volkswagen",
      model_name: "Golf VII",
      year_start: "2012",
      year_end: "2019",
      engine_code: "CJSA",
      engine_displacement_cc: "1400",
      fuel_type: "gasoline",
    });
  });

  it("creates compatibility mappings", () => {
    const products = [makeProduct()];
    const result = mapProductsToEntities(products, "test");

    expect(result.compatibility).toHaveLength(1);
    expect(result.compatibility[0]).toMatchObject({
      part_oem_number: "0986494524",
      part_manufacturer: "Bosch",
      vehicle_make: "Volkswagen",
      vehicle_model: "Golf VII",
      vehicle_year_start: "2012",
      engine_code: "CJSA",
    });
  });

  it("creates cross-reference records", () => {
    const products = [makeProduct()];
    const result = mapProductsToEntities(products, "test");

    expect(result.crossReferences).toHaveLength(1);
    expect(result.crossReferences[0]).toMatchObject({
      part_oem_number: "0986494524",
      part_manufacturer: "Bosch",
      cross_ref_oem_number: "GDB1550",
      cross_ref_manufacturer: "TRW",
      cross_ref_type: "equivalent",
    });
  });

  it("skips products without OEM number", () => {
    const products = [makeProduct({ oemNumber: undefined })];
    const result = mapProductsToEntities(products, "test");

    expect(result.parts).toHaveLength(0);
    expect(result.manufacturers).toHaveLength(0);
  });

  it("skips products without brand", () => {
    const products = [makeProduct({ brand: undefined })];
    const result = mapProductsToEntities(products, "test");

    expect(result.parts).toHaveLength(0);
  });

  it("handles products without optional fields", () => {
    const products = [
      makeProduct({
        categoryPath: undefined,
        compatibleVehicles: undefined,
        crossReferences: undefined,
        weightGrams: undefined,
        description: undefined,
      }),
    ];

    const result = mapProductsToEntities(products, "test");

    expect(result.parts).toHaveLength(1);
    expect(result.categories).toHaveLength(0);
    expect(result.vehicles).toHaveLength(0);
    expect(result.compatibility).toHaveLength(0);
    expect(result.crossReferences).toHaveLength(0);
  });

  it("deduplicates vehicles across products", () => {
    const sharedVehicle = {
      make: "Volkswagen",
      model: "Golf VII",
      yearStart: 2012,
      engineCode: "CJSA",
    };

    const products = [
      makeProduct({ compatibleVehicles: [sharedVehicle] }),
      makeProduct({
        oemNumber: "0986494525",
        compatibleVehicles: [sharedVehicle],
      }),
    ];

    const result = mapProductsToEntities(products, "test");
    expect(result.vehicles).toHaveLength(1);
    // But compatibility entries are not deduped — one per product
    expect(result.compatibility).toHaveLength(2);
  });

  it("handles accented category names in slugs", () => {
    const products = [
      makeProduct({
        categoryPath: ["Système de freinage", "Plaquettes de frein"],
      }),
    ];

    const result = mapProductsToEntities(products, "test");
    expect(result.categories[0].slug).toBe("systeme-de-freinage");
    expect(result.categories[1].slug).toBe("plaquettes-de-frein");
  });

  it("sets siteId on result", () => {
    const result = mapProductsToEntities([makeProduct()], "oscaro");
    expect(result.siteId).toBe("oscaro");
  });
});
