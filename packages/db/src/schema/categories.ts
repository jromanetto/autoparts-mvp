import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referencing FK requires any
    parentId: uuid("parent_id").references((): any => categories.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    level: integer("level").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_slug_idx").on(table.slug),
    index("categories_level_sort_idx").on(table.level, table.sortOrder),
  ]
);
