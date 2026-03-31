import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { parts } from "./parts.js";

export const stockStatusEnum = pgEnum("stock_status", [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "discontinued",
]);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  website: text("website"),
  country: varchar("country", { length: 100 }),
  apiEndpoint: text("api_endpoint"),
  contactEmail: varchar("contact_email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const supplierParts = pgTable(
  "supplier_parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    supplierSku: varchar("supplier_sku", { length: 100 }),
    priceCents: integer("price_cents"),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    stockStatus: stockStatusEnum("stock_status")
      .notNull()
      .default("in_stock"),
    lastPriceUpdate: timestamp("last_price_update", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("supplier_parts_supplier_part_uniq").on(
      table.supplierId,
      table.partId
    ),
    index("supplier_parts_part_id_idx").on(table.partId),
    index("supplier_parts_supplier_id_idx").on(table.supplierId),
    index("supplier_parts_stock_status_idx").on(table.stockStatus),
  ]
);
