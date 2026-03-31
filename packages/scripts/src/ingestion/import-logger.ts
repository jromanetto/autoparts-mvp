import type { ImportResult, ImportStats, ImportError } from "./types.js";

export function createEmptyStats(): ImportStats {
  return { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 };
}

export function formatImportResult(result: ImportResult): string {
  const lines: string[] = [];
  lines.push(`=== Import: ${result.entityType} ===`);
  lines.push(`Duration: ${result.durationMs}ms`);
  lines.push(
    `Total: ${result.stats.total} | Created: ${result.stats.created} | Updated: ${result.stats.updated} | Skipped: ${result.stats.skipped} | Errors: ${result.stats.errors}`,
  );

  if (result.errors.length > 0) {
    lines.push(`\nErrors (${result.errors.length}):`);
    for (const err of result.errors.slice(0, 50)) {
      const field = err.field ? ` [${err.field}]` : "";
      lines.push(`  Row ${err.row}${field}: ${err.message}`);
    }
    if (result.errors.length > 50) {
      lines.push(`  ... and ${result.errors.length - 50} more errors`);
    }
  }

  return lines.join("\n");
}

export function formatImportSummary(results: ImportResult[]): string {
  const lines: string[] = [];
  lines.push("=== Import Summary ===");

  const totals = createEmptyStats();
  for (const r of results) {
    totals.total += r.stats.total;
    totals.created += r.stats.created;
    totals.updated += r.stats.updated;
    totals.skipped += r.stats.skipped;
    totals.errors += r.stats.errors;
  }

  for (const r of results) {
    const status = r.stats.errors > 0 ? "WARN" : "OK";
    lines.push(
      `  [${status}] ${r.entityType}: ${r.stats.created} created, ${r.stats.updated} updated, ${r.stats.skipped} skipped, ${r.stats.errors} errors`,
    );
  }

  lines.push(
    `\nTotals: ${totals.total} rows | ${totals.created} created | ${totals.updated} updated | ${totals.skipped} skipped | ${totals.errors} errors`,
  );

  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  lines.push(`Total duration: ${totalDuration}ms`);

  return lines.join("\n");
}

export function shouldAbort(
  errors: ImportError[],
  maxErrors: number,
): boolean {
  return errors.length >= maxErrors;
}
