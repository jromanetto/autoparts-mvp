import type { FastifyPluginAsync } from "fastify";
import { categories } from "@autoparts/db";
import { eq, count, ilike, isNull, asc, and, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  paginationSchema,
  paginate,
  paginatedResponse,
} from "../lib/pagination.js";

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  parentId: z.string().uuid().nullish(),
  description: z.string().nullish(),
  level: z.number().int().min(0).default(0),
  sortOrder: z.number().int().min(0).default(0),
});

const updateCategorySchema = createCategorySchema.partial();

const listQuerySchema = paginationSchema.extend({
  parentId: z.string().uuid().optional(),
  root: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

const categoriesRoutes: FastifyPluginAsync = async (app) => {
  // List categories
  app.get("/", {
    schema: {
      tags: ["Categories"],
      summary: "List categories",
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          parentId: { type: "string", format: "uuid" },
          root: { type: "boolean" },
          search: { type: "string" },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request) => {
      const query = listQuerySchema.parse(request.query);
      const { limit, offset } = paginate(query);

      const conditions: SQL[] = [];
      if (query.root) conditions.push(isNull(categories.parentId));
      if (query.parentId) conditions.push(eq(categories.parentId, query.parentId));
      if (query.search) conditions.push(ilike(categories.name, `%${query.search}%`));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [data, [{ total }]] = await Promise.all([
        app.db
          .select()
          .from(categories)
          .where(whereClause)
          .orderBy(asc(categories.level), asc(categories.sortOrder))
          .limit(limit)
          .offset(offset),
        app.db.select({ total: count() }).from(categories).where(whereClause),
      ]);

      return paginatedResponse(data, total, query);
    },
  });

  // Get category by ID
  app.get<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Categories"],
      summary: "Get category by ID",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [category] = await app.db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (!category) {
        return reply.code(404).send({ error: "Category not found" });
      }
      return category;
    },
  });

  // Create category
  app.post("/", {
    schema: {
      tags: ["Categories"],
      summary: "Create category",
      body: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          parentId: { type: "string", format: "uuid", nullable: true },
          description: { type: "string", nullable: true },
          level: { type: "integer", default: 0 },
          sortOrder: { type: "integer", default: 0 },
        },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const body = createCategorySchema.parse(request.body);
      const [created] = await app.db
        .insert(categories)
        .values(body)
        .returning();
      return reply.code(201).send(created);
    },
  });

  // Update category
  app.put<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Categories"],
      summary: "Update category",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const body = updateCategorySchema.parse(request.body);
      const [updated] = await app.db
        .update(categories)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "Category not found" });
      }
      return updated;
    },
  });

  // Delete category
  app.delete<{ Params: { id: string } }>("/:id", {
    schema: {
      tags: ["Categories"],
      summary: "Delete category",
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", format: "uuid" } },
      },
    },
    preHandler: app.authenticate,
    handler: async (request, reply) => {
      const { id } = request.params;
      const [deleted] = await app.db
        .delete(categories)
        .where(eq(categories.id, id))
        .returning();

      if (!deleted) {
        return reply.code(404).send({ error: "Category not found" });
      }
      return reply.code(204).send();
    },
  });
};

export default categoriesRoutes;
