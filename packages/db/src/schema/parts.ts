import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { manufacturers } from "./manufacturers.js";
import { categories } from "./categories.js";

export const partStatusEnum = pgEnum("part_status", [
  "active",
  "discontinued",
  "pending",
]);

export const parts = pgTable(
  "parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    oemNumber: varchar("oem_number", { length: 100 }).notNull(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    specifications: jsonb("specifications").$type<Record<string, unknown>>(),
    weightGrams: integer("weight_grams"),
    dimensions: jsonb("dimensions").$type<{
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
    }>(),
    imageUrls: text("image_urls").array(),
    status: partStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("parts_oem_number_idx").on(table.oemNumber),
    index("parts_manufacturer_id_idx").on(table.manufacturerId),
    index("parts_category_id_idx").on(table.categoryId),
    index("parts_status_idx").on(table.status),
    // Trigram index for fuzzy OEM number search (requires pg_trgm extension)
    index("parts_oem_number_trgm_idx").using(
      "gin",
      sql`oem_number gin_trgm_ops`
    ),
    // Full-text search index on name + description
    index("parts_search_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))`
    ),
  ]
);

export const oemCrossReferences = pgTable(
  "oem_cross_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    crossRefOemNumber: varchar("cross_ref_oem_number", {
      length: 100,
    }).notNull(),
    crossRefManufacturer: varchar("cross_ref_manufacturer", { length: 255 }),
    crossRefType: varchar("cross_ref_type", { length: 50 })
      .notNull()
      .default("equivalent"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("oem_xref_part_id_idx").on(table.partId),
    index("oem_xref_oem_number_idx").on(table.crossRefOemNumber),
    // Trigram index for fuzzy cross-reference search
    index("oem_xref_oem_number_trgm_idx").using(
      "gin",
      sql`cross_ref_oem_number gin_trgm_ops`
    ),
  ]
);
