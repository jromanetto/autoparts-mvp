import { describe, it, expect, vi, beforeEach } from "vitest";
import { importManufacturers } from "../ingestion/importers/manufacturer-importer.js";
import { importCategories } from "../ingestion/importers/category-importer.js";
import { importParts } from "../ingestion/importers/part-importer.js";
import { importVehicles } from "../ingestion/importers/vehicle-importer.js";
import { importCrossReferences } from "../ingestion/importers/cross-reference-importer.js";
import { importCompatibility } from "../ingestion/importers/compatibility-importer.js";
import type { ImportJobOptions } from "../ingestion/types.js";
import type { Database } from "@autoparts/db";

// Mock DB helper
function createMockDb() {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: crypto.randomUUID() }]),
    }),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as Database;

  return mockDb;
}

function makeOptions(
  db: Database,
  overrides?: Partial<ImportJobOptions>,
): ImportJobOptions {
  return {
    db,
    filePath: "test.csv",
    ...overrides,
  };
}

describe("importManufacturers", () => {
  let db: Database;

  beforeEach(() => {
    db = createMockDb();
  });

  it("reports validation errors for invalid rows", async () => {
    const result = await importManufacturers(
      [{ name: "" }, { name: "Bosch" }],
      makeOptions(db),
    );
    expect(result.entityType).toBe("manufacturers");
    expect(result.stats.total).toBe(2);
    expect(result.stats.errors).toBe(1);
    expect(result.stats.created).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("name");
  });

  it("counts all as created in dry run", async () => {
    const result = await importManufacturers(
      [{ name: "Bosch" }, { name: "Valeo" }],
      makeOptions(db, { dryRun: true }),
    );
    expect(result.stats.created).toBe(2);
    expect(result.stats.total).toBe(2);
    // DB should not be called in dry run
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("stops after maxErrors", async () => {
    const rows = Array.from({ length: 10 }, () => ({ name: "" }));
    const result = await importManufacturers(rows, makeOptions(db, { maxErrors: 3 }));
    expect(result.stats.errors).toBe(3);
    // Should have stopped processing
    expect(result.stats.total).toBe(10);
  });

  it("creates new manufacturer when none exists", async () => {
    const result = await importManufacturers(
      [{ name: "Bosch", country: "Germany", website: "https://bosch.com" }],
      makeOptions(db),
    );
    expect(result.stats.created).toBe(1);
    expect(db.insert).toHaveBeenCalled();
  });

  it("includes timing information", async () => {
    const result = await importManufacturers(
      [{ name: "Bosch" }],
      makeOptions(db),
    );
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("importCategories", () => {
  let db: Database;

  beforeEach(() => {
    db = createMockDb();
  });

  it("validates and imports categories in dry run", async () => {
    const result = await importCategories(
      [
        { name: "Brakes", slug: "brakes" },
        { name: "", slug: "" },
      ],
      makeOptions(db, { dryRun: true }),
    );
    expect(result.stats.created).toBe(1);
    expect(result.stats.errors).toBe(1);
  });

  it("creates new categories", async () => {
    const result = await importCategories(
      [{ name: "Brakes", slug: "brakes", level: "0", sort_order: "1" }],
      makeOptions(db),
    );
    expect(result.stats.created).toBe(1);
    expect(result.entityType).toBe("categories");
  });
});

describe("importParts", () => {
  let db: Database;

  beforeEach(() => {
    db = createMockDb();
  });

  it("validates part rows in dry run", async () => {
    const result = await importParts(
      [
        {
          oem_number: "0986494524",
          manufacturer_name: "Bosch",
          name: "Brake Pad Set",
        },
        { oem_number: "", manufacturer_name: "", name: "" },
      ],
      makeOptions(db, { dryRun: true }),
    );
    expect(result.stats.created).toBe(1);
    expect(result.stats.errors).toBe(1);
  });

  it("reports error when manufacturer not found", async () => {
    // Default mock returns empty array for select queries
    const result = await importParts(
      [
        {
          oem_number: "0986494524",
          manufacturer_name: "NonExistent",
          name: "Brake Pad Set",
        },
      ],
      makeOptions(db),
    );
    expect(result.stats.errors).toBe(1);
    expect(result.errors[0].message).toContain("NonExistent");
  });
});

describe("importVehicles", () => {
  let db: Database;

  beforeEach(() => {
    db = createMockDb();
  });

  it("validates vehicle rows in dry run", async () => {
    const result = await importVehicles(
      [
        {
          make_name: "BMW",
          model_name: "3 Series",
          year_start: "2019",
          year_end: "2023",
        },
        { make_name: "", model_name: "", year_start: "" },
      ],
      makeOptions(db, { dryRun: true }),
    );
    expect(result.stats.created).toBe(1);
    expect(result.stats.errors).toBe(1);
  });

  it("creates make, model, and vehicle", async () => {
    const result = await importVehicles(
      [
        {
          make_name: "BMW",
          model_name: "3 Series",
          year_start: "2019",
          engine_code: "B48B20",
        },
      ],
      makeOptions(db),
    );
    // Creates vehicle (make and model are auto-created)
    expect(result.stats.created).toBe(1);
    expect(result.entityType).toBe("vehicles");
  });
});

describe("importCompatibility", () => {
  let db: Database;

  beforeEach(() => {
    db = createMockDb();
  });

  it("validates compatibility rows in dry run", async () => {
    const result = await importCompatibility(
      [
        {
          part_oem_number: "123",
          part_manufacturer: "Bosch",
          vehicle_make: "BMW",
          vehicle_model: "3 Series",
          vehicle_year_start: "2020",
        },
        {
          part_oem_number: "",
          part_manufacturer: "",
          vehicle_make: "",
          vehicle_model: "",
          vehicle_year_start: "",
        },
      ],
      makeOptions(db, { dryRun: true }),
    );
    expect(result.stats.created).toBe(1);
    expect(result.stats.errors).toBe(1);
  });
});

describe("importCrossReferences", () => {
  let db: Database;

  beforeEach(() => {
    db = createMockDb();
  });

  it("validates cross-reference rows in dry run", async () => {
    const result = await importCrossReferences(
      [
        {
          part_oem_number: "123",
          part_manufacturer: "Bosch",
          cross_ref_oem_number: "456",
        },
        {
          part_oem_number: "",
          part_manufacturer: "",
          cross_ref_oem_number: "",
        },
      ],
      makeOptions(db, { dryRun: true }),
    );
    expect(result.stats.created).toBe(1);
    expect(result.stats.errors).toBe(1);
  });
});
