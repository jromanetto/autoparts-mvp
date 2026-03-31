import { describe, it, expect } from "vitest";
import {
  validateManufacturerRow,
  validateCategoryRow,
  validatePartRow,
  validateVehicleRow,
  validateCompatibilityRow,
  validateCrossReferenceRow,
} from "../ingestion/validators.js";

describe("validateManufacturerRow", () => {
  it("passes valid row", () => {
    expect(
      validateManufacturerRow({ name: "Bosch", country: "Germany" }, 1),
    ).toEqual([]);
  });

  it("fails on missing name", () => {
    const errors = validateManufacturerRow({ name: "" }, 1);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("name");
  });
});

describe("validateCategoryRow", () => {
  it("passes valid row", () => {
    expect(
      validateCategoryRow(
        { name: "Brakes", slug: "brakes", level: "0", sort_order: "1" },
        1,
      ),
    ).toEqual([]);
  });

  it("fails on missing name and slug", () => {
    const errors = validateCategoryRow({ name: "", slug: "" }, 1);
    expect(errors).toHaveLength(2);
  });

  it("fails on invalid level", () => {
    const errors = validateCategoryRow(
      { name: "Brakes", slug: "brakes", level: "abc" },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("level");
  });
});

describe("validatePartRow", () => {
  it("passes valid row", () => {
    expect(
      validatePartRow(
        {
          oem_number: "0986494524",
          manufacturer_name: "Bosch",
          name: "Brake Pad Set",
          status: "active",
        },
        1,
      ),
    ).toEqual([]);
  });

  it("fails on missing required fields", () => {
    const errors = validatePartRow(
      { oem_number: "", manufacturer_name: "", name: "" },
      1,
    );
    expect(errors).toHaveLength(3);
  });

  it("fails on invalid status", () => {
    const errors = validatePartRow(
      {
        oem_number: "123",
        manufacturer_name: "Bosch",
        name: "Test",
        status: "invalid",
      },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("status");
  });

  it("fails on invalid weight_grams", () => {
    const errors = validatePartRow(
      {
        oem_number: "123",
        manufacturer_name: "Bosch",
        name: "Test",
        weight_grams: "-5",
      },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("weight_grams");
  });
});

describe("validateVehicleRow", () => {
  it("passes valid row", () => {
    expect(
      validateVehicleRow(
        {
          make_name: "BMW",
          model_name: "3 Series",
          year_start: "2019",
          year_end: "2023",
          engine_code: "B48B20",
        },
        1,
      ),
    ).toEqual([]);
  });

  it("fails on missing required fields", () => {
    const errors = validateVehicleRow(
      { make_name: "", model_name: "", year_start: "" },
      1,
    );
    expect(errors).toHaveLength(3);
  });

  it("fails on invalid year", () => {
    const errors = validateVehicleRow(
      { make_name: "BMW", model_name: "3 Series", year_start: "1800" },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("year_start");
  });

  it("fails when year_end < year_start", () => {
    const errors = validateVehicleRow(
      {
        make_name: "BMW",
        model_name: "3 Series",
        year_start: "2020",
        year_end: "2019",
      },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("year_end");
  });

  it("passes when year_end is empty", () => {
    expect(
      validateVehicleRow(
        { make_name: "BMW", model_name: "3 Series", year_start: "2020" },
        1,
      ),
    ).toEqual([]);
  });
});

describe("validateCompatibilityRow", () => {
  it("passes valid row", () => {
    expect(
      validateCompatibilityRow(
        {
          part_oem_number: "123",
          part_manufacturer: "Bosch",
          vehicle_make: "BMW",
          vehicle_model: "3 Series",
          vehicle_year_start: "2020",
          quantity_needed: "2",
          position: "front",
        },
        1,
      ),
    ).toEqual([]);
  });

  it("fails on missing required fields", () => {
    const errors = validateCompatibilityRow(
      {
        part_oem_number: "",
        part_manufacturer: "",
        vehicle_make: "",
        vehicle_model: "",
        vehicle_year_start: "",
      },
      1,
    );
    expect(errors).toHaveLength(5);
  });

  it("fails on invalid quantity_needed", () => {
    const errors = validateCompatibilityRow(
      {
        part_oem_number: "123",
        part_manufacturer: "Bosch",
        vehicle_make: "BMW",
        vehicle_model: "3 Series",
        vehicle_year_start: "2020",
        quantity_needed: "abc",
      },
      1,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("quantity_needed");
  });
});

describe("validateCrossReferenceRow", () => {
  it("passes valid row", () => {
    expect(
      validateCrossReferenceRow(
        {
          part_oem_number: "123",
          part_manufacturer: "Bosch",
          cross_ref_oem_number: "456",
          cross_ref_manufacturer: "TRW",
          cross_ref_type: "equivalent",
        },
        1,
      ),
    ).toEqual([]);
  });

  it("fails on missing required fields", () => {
    const errors = validateCrossReferenceRow(
      {
        part_oem_number: "",
        part_manufacturer: "",
        cross_ref_oem_number: "",
      },
      1,
    );
    expect(errors).toHaveLength(3);
  });
});
