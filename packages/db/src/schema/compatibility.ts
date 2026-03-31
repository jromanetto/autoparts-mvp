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
} from "drizzle-orm/pg-core";
import { parts } from "./parts.js";
import { vehicles } from "./vehicles.js";

export const partVehicleCompatibility = pgTable(
  "part_vehicle_compatibility",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    fitmentNotes: text("fitment_notes"),
    quantityNeeded: integer("quantity_needed").default(1),
    position: varchar("position", { length: 100 }),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("compatibility_part_vehicle_uniq").on(
      table.partId,
      table.vehicleId,
      table.position
    ),
    index("compatibility_part_id_idx").on(table.partId),
    index("compatibility_vehicle_id_idx").on(table.vehicleId),
    index("compatibility_verified_idx").on(table.verified),
  ]
);
