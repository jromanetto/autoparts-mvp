import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";

export interface CsvParseOptions {
  /** CSV delimiter (default: ',') */
  delimiter?: string;
  /** Whether first row is headers (default: true) */
  headers?: boolean;
  /** Skip empty lines (default: true) */
  skipEmpty?: boolean;
}

/**
 * Parse a CSV file into typed row objects.
 * Uses first row as column headers, trims whitespace, skips empty lines.
 */
export function parseCsvFile<T>(
  filePath: string,
  options: CsvParseOptions = {},
): T[] {
  const content = readFileSync(filePath, "utf-8");
  return parseCsvString<T>(content, options);
}

/**
 * Parse a CSV string into typed row objects.
 */
export function parseCsvString<T>(
  content: string,
  options: CsvParseOptions = {},
): T[] {
  const { delimiter = ",", headers = true, skipEmpty = true } = options;

  const records = parse(content, {
    columns: headers,
    skip_empty_lines: skipEmpty,
    trim: true,
    delimiter,
    relax_column_count: true,
  }) as unknown as T[];

  return records;
}
