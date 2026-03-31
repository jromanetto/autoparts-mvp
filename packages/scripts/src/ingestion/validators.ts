import type {
  ImportError,
  ManufacturerRow,
  CategoryRow,
  PartRow,
  VehicleRow,
  CompatibilityRow,
  CrossReferenceRow,
} from "./types.js";

function required(
  row: number,
  field: string,
  value: string | undefined,
): ImportError | null {
  if (!value || value.trim() === "") {
    return { row, field, message: `${field} is required` };
  }
  return null;
}

function isPositiveInt(
  row: number,
  field: string,
  value: string | undefined,
): ImportError | null {
  if (value !== undefined && value !== "") {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      return { row, field, message: `${field} must be a positive integer` };
    }
  }
  return null;
}

function isYear(
  row: number,
  field: string,
  value: string | undefined,
): ImportError | null {
  if (value !== undefined && value !== "") {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1900 || n > 2100) {
      return { row, field, message: `${field} must be a valid year (1900-2100)` };
    }
  }
  return null;
}

function collect(...checks: (ImportError | null)[]): ImportError[] {
  return checks.filter((e): e is ImportError => e !== null);
}

const VALID_PART_STATUSES = ["active", "discontinued", "pending"];

export function validateManufacturerRow(
  row: ManufacturerRow,
  rowIndex: number,
): ImportError[] {
  return collect(required(rowIndex, "name", row.name));
}

export function validateCategoryRow(
  row: CategoryRow,
  rowIndex: number,
): ImportError[] {
  return collect(
    required(rowIndex, "name", row.name),
    required(rowIndex, "slug", row.slug),
    isPositiveInt(rowIndex, "level", row.level),
    isPositiveInt(rowIndex, "sort_order", row.sort_order),
  );
}

export function validatePartRow(
  row: PartRow,
  rowIndex: number,
): ImportError[] {
  const errors = collect(
    required(rowIndex, "oem_number", row.oem_number),
    required(rowIndex, "manufacturer_name", row.manufacturer_name),
    required(rowIndex, "name", row.name),
    isPositiveInt(rowIndex, "weight_grams", row.weight_grams),
  );

  if (row.status && !VALID_PART_STATUSES.includes(row.status)) {
    errors.push({
      row: rowIndex,
      field: "status",
      message: `status must be one of: ${VALID_PART_STATUSES.join(", ")}`,
    });
  }

  return errors;
}

export function validateVehicleRow(
  row: VehicleRow,
  rowIndex: number,
): ImportError[] {
  const errors = collect(
    required(rowIndex, "make_name", row.make_name),
    required(rowIndex, "model_name", row.model_name),
    required(rowIndex, "year_start", row.year_start),
    isYear(rowIndex, "year_start", row.year_start),
    isYear(rowIndex, "year_end", row.year_end),
    isPositiveInt(rowIndex, "engine_displacement_cc", row.engine_displacement_cc),
  );

  if (row.year_start && row.year_end) {
    const start = Number(row.year_start);
    const end = Number(row.year_end);
    if (!isNaN(start) && !isNaN(end) && end < start) {
      errors.push({
        row: rowIndex,
        field: "year_end",
        message: "year_end must be >= year_start",
      });
    }
  }

  return errors;
}

export function validateCompatibilityRow(
  row: CompatibilityRow,
  rowIndex: number,
): ImportError[] {
  return collect(
    required(rowIndex, "part_oem_number", row.part_oem_number),
    required(rowIndex, "part_manufacturer", row.part_manufacturer),
    required(rowIndex, "vehicle_make", row.vehicle_make),
    required(rowIndex, "vehicle_model", row.vehicle_model),
    required(rowIndex, "vehicle_year_start", row.vehicle_year_start),
    isYear(rowIndex, "vehicle_year_start", row.vehicle_year_start),
    isPositiveInt(rowIndex, "quantity_needed", row.quantity_needed),
  );
}

export function validateCrossReferenceRow(
  row: CrossReferenceRow,
  rowIndex: number,
): ImportError[] {
  return collect(
    required(rowIndex, "part_oem_number", row.part_oem_number),
    required(rowIndex, "part_manufacturer", row.part_manufacturer),
    required(rowIndex, "cross_ref_oem_number", row.cross_ref_oem_number),
  );
}
