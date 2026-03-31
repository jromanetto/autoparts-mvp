import { describe, it, expect } from "vitest";
import {
  createEmptyStats,
  formatImportResult,
  formatImportSummary,
  shouldAbort,
} from "../ingestion/import-logger.js";
import type { ImportResult } from "../ingestion/types.js";

describe("createEmptyStats", () => {
  it("returns zeroed stats", () => {
    const stats = createEmptyStats();
    expect(stats).toEqual({
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    });
  });
});

describe("shouldAbort", () => {
  it("returns false when under limit", () => {
    expect(shouldAbort([{ row: 1, message: "err" }], 5)).toBe(false);
  });

  it("returns true when at limit", () => {
    const errors = Array.from({ length: 5 }, (_, i) => ({
      row: i,
      message: "err",
    }));
    expect(shouldAbort(errors, 5)).toBe(true);
  });
});

describe("formatImportResult", () => {
  it("formats result without errors", () => {
    const result: ImportResult = {
      entityType: "manufacturers",
      stats: { total: 10, created: 8, updated: 2, skipped: 0, errors: 0 },
      errors: [],
      startedAt: new Date("2024-01-01T00:00:00Z"),
      completedAt: new Date("2024-01-01T00:00:01Z"),
      durationMs: 1000,
    };
    const output = formatImportResult(result);
    expect(output).toContain("manufacturers");
    expect(output).toContain("1000ms");
    expect(output).toContain("Created: 8");
    expect(output).toContain("Updated: 2");
    expect(output).not.toContain("Errors (");
  });

  it("formats result with errors", () => {
    const result: ImportResult = {
      entityType: "parts",
      stats: { total: 10, created: 5, updated: 0, skipped: 0, errors: 5 },
      errors: [
        { row: 1, field: "oem_number", message: "oem_number is required" },
        { row: 3, message: "unknown error" },
      ],
      startedAt: new Date("2024-01-01T00:00:00Z"),
      completedAt: new Date("2024-01-01T00:00:01Z"),
      durationMs: 500,
    };
    const output = formatImportResult(result);
    expect(output).toContain("Errors (2)");
    expect(output).toContain("Row 1 [oem_number]");
    expect(output).toContain("Row 3:");
  });
});

describe("formatImportSummary", () => {
  it("formats multiple results", () => {
    const results: ImportResult[] = [
      {
        entityType: "manufacturers",
        stats: { total: 5, created: 5, updated: 0, skipped: 0, errors: 0 },
        errors: [],
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 100,
      },
      {
        entityType: "parts",
        stats: { total: 10, created: 8, updated: 2, skipped: 0, errors: 0 },
        errors: [],
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 200,
      },
    ];
    const output = formatImportSummary(results);
    expect(output).toContain("Import Summary");
    expect(output).toContain("[OK] manufacturers");
    expect(output).toContain("[OK] parts");
    expect(output).toContain("15 rows");
    expect(output).toContain("300ms");
  });

  it("shows WARN for entities with errors", () => {
    const results: ImportResult[] = [
      {
        entityType: "parts",
        stats: { total: 10, created: 5, updated: 0, skipped: 0, errors: 5 },
        errors: [{ row: 1, message: "err" }],
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 100,
      },
    ];
    const output = formatImportSummary(results);
    expect(output).toContain("[WARN] parts");
  });
});
