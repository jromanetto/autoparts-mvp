import { eq } from "drizzle-orm";
import { categories } from "@autoparts/db/schema";
import type {
  CategoryRow,
  ImportJobOptions,
  ImportResult,
  ImportError,
} from "../types.js";
import { validateCategoryRow } from "../validators.js";
import { createEmptyStats, shouldAbort } from "../import-logger.js";

export async function importCategories(
  rows: CategoryRow[],
  options: ImportJobOptions,
): Promise<ImportResult> {
  const startedAt = new Date();
  const stats = createEmptyStats();
  const errors: ImportError[] = [];
  const maxErrors = options.maxErrors ?? 100;

  stats.total = rows.length;

  // Sort rows: parents first (those without parent_slug come first)
  const sorted = [...rows].sort((a, b) => {
    if (!a.parent_slug && b.parent_slug) return -1;
    if (a.parent_slug && !b.parent_slug) return 1;
    return 0;
  });

  // Cache slug -> id mapping for parent resolution
  const slugToId = new Map<string, string>();

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const rowErrors = validateCategoryRow(row, i + 1);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      stats.errors += 1;
      if (shouldAbort(errors, maxErrors)) break;
      continue;
    }

    // Resolve parent
    let parentId: string | null = null;
    if (row.parent_slug) {
      const cached = slugToId.get(row.parent_slug);
      if (cached) {
        parentId = cached;
      } else if (!options.dryRun) {
        const parent = await options.db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, row.parent_slug))
          .limit(1);
        if (parent.length > 0) {
          parentId = parent[0].id;
          slugToId.set(row.parent_slug, parentId);
        } else {
          errors.push({
            row: i + 1,
            field: "parent_slug",
            message: `Parent category '${row.parent_slug}' not found`,
          });
          stats.errors += 1;
          if (shouldAbort(errors, maxErrors)) break;
          continue;
        }
      }
    }

    if (options.dryRun) {
      stats.created += 1;
      continue;
    }

    const existing = await options.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, row.slug))
      .limit(1);

    const level = row.level ? parseInt(row.level, 10) : 0;
    const sortOrder = row.sort_order ? parseInt(row.sort_order, 10) : 0;

    if (existing.length > 0) {
      await options.db
        .update(categories)
        .set({
          name: row.name,
          parentId,
          description: row.description || null,
          level,
          sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, existing[0].id));
      slugToId.set(row.slug, existing[0].id);
      stats.updated += 1;
    } else {
      const inserted = await options.db
        .insert(categories)
        .values({
          name: row.name,
          slug: row.slug,
          parentId,
          description: row.description || null,
          level,
          sortOrder,
        })
        .returning({ id: categories.id });
      slugToId.set(row.slug, inserted[0].id);
      stats.created += 1;
    }
  }

  const completedAt = new Date();
  return {
    entityType: "categories",
    stats,
    errors,
    startedAt,
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
