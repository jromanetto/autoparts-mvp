import type { Database } from "@autoparts/db";

// --- Import Job ---

export type ImportEntityType =
  | "manufacturers"
  | "categories"
  | "parts"
  | "vehicles"
  | "compatibility"
  | "cross_references";

export interface ImportStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ImportResult {
  entityType: ImportEntityType;
  stats: ImportStats;
  errors: ImportError[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

export interface ImportJobOptions {
  /** Database instance */
  db: Database;
  /** Path to the CSV file */
  filePath: string;
  /** Whether to perform a dry run (validate only, no DB writes) */
  dryRun?: boolean;
  /** Maximum number of errors before aborting */
  maxErrors?: number;
  /** Batch size for DB operations */
  batchSize?: number;
}

// --- CSV Row Types ---

export interface ManufacturerRow {
  name: string;
  country?: string;
  website?: string;
}

export interface CategoryRow {
  name: string;
  slug: string;
  parent_slug?: string;
  description?: string;
  level?: string;
  sort_order?: string;
}

export interface PartRow {
  oem_number: string;
  manufacturer_name: string;
  category_slug?: string;
  name: string;
  description?: string;
  weight_grams?: string;
  status?: string;
}

export interface VehicleRow {
  make_name: string;
  model_name: string;
  year_start: string;
  year_end?: string;
  engine_code?: string;
  engine_displacement_cc?: string;
  fuel_type?: string;
  body_type?: string;
  trim?: string;
  ktype_number?: string;
}

export interface CompatibilityRow {
  part_oem_number: string;
  part_manufacturer: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year_start: string;
  engine_code?: string;
  fitment_notes?: string;
  quantity_needed?: string;
  position?: string;
}

export interface CrossReferenceRow {
  part_oem_number: string;
  part_manufacturer: string;
  cross_ref_oem_number: string;
  cross_ref_manufacturer?: string;
  cross_ref_type?: string;
  notes?: string;
}

// --- Importer Interface ---

export interface Importer<TRow> {
  entityType: ImportEntityType;
  validate(row: TRow, rowIndex: number): ImportError[];
  import(rows: TRow[], options: ImportJobOptions): Promise<ImportResult>;
}
