import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const vehicleMakes = pgTable(
  "vehicle_makes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    country: varchar("country", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("vehicle_makes_slug_idx").on(table.slug)]
);

export const vehicleModels = pgTable(
  "vehicle_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    makeId: uuid("make_id")
      .notNull()
      .references(() => vehicleMakes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("vehicle_models_make_id_idx").on(table.makeId),
    uniqueIndex("vehicle_models_make_slug_uniq").on(table.makeId, table.slug),
  ]
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => vehicleModels.id, { onDelete: "cascade" }),
    yearStart: integer("year_start").notNull(),
    yearEnd: integer("year_end"),
    engineCode: varchar("engine_code", { length: 50 }),
    engineDisplacementCc: integer("engine_displacement_cc"),
    fuelType: varchar("fuel_type", { length: 50 }),
    bodyType: varchar("body_type", { length: 100 }),
    trim: varchar("trim", { length: 255 }),
    ktypeNumber: varchar("ktype_number", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("vehicles_model_id_idx").on(table.modelId),
    index("vehicles_year_range_idx").on(table.yearStart, table.yearEnd),
    index("vehicles_engine_code_idx").on(table.engineCode),
    index("vehicles_ktype_idx").on(table.ktypeNumber),
  ]
);
